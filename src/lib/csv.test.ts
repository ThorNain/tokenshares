import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  const rows = [
    { name: "Dupont; Claire", note: 'dit "bonjour"', amount: 220.5 },
    { name: "Martin\nJulien", note: null as string | null, amount: 0 },
  ];
  const columns = [
    { header: "Nom", value: (r: (typeof rows)[number]) => r.name },
    { header: "Note", value: (r: (typeof rows)[number]) => r.note },
    { header: "Montant", value: (r: (typeof rows)[number]) => r.amount },
  ];

  it("échappe les points-virgules, guillemets et sauts de ligne", () => {
    const csv = toCsv(rows, columns);
    expect(csv).toContain('"Dupont; Claire"');
    expect(csv).toContain('"dit ""bonjour"""');
    expect(csv).toContain('"Martin\nJulien"');
  });

  it("commence par un BOM UTF-8 (compatibilité Excel)", () => {
    const csv = toCsv(rows, columns);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("produit l'en-tête et une ligne par enregistrement", () => {
    const csv = toCsv(rows, columns);
    // BOM + header + 2 lignes (le \n interne est dans une cellule quotée).
    expect(csv.split("\r\n")).toHaveLength(3);
    expect(csv.split("\r\n")[0]).toContain("Nom;Note;Montant");
  });

  it("sérialise null/undefined en cellule vide", () => {
    const csv = toCsv(rows, columns);
    expect(csv.split("\r\n")[2]).toContain(";;");
  });
});
