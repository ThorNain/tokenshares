/**
 * Export CSV (compatible Excel : BOM UTF-8, séparateur point-virgule fr).
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Anti-injection de formule : un tableur (Excel/LibreOffice) interprète une
  // cellule commençant par = + - @ (ou tab/CR) comme une formule. On la
  // neutralise en la préfixant d'une apostrophe. Cf. OWASP « CSV Injection ».
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[";\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(";");
  const lines = rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(";"));
  // BOM pour qu'Excel détecte l'UTF-8.
  return "﻿" + [header, ...lines].join("\r\n");
}
