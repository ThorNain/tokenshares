import { describe, expect, it } from "vitest";
import { convertToEuro, euroRate, EURO_CURRENCY } from "@/lib/fx";

describe("conversion vers l'euro", () => {
  it("conserve un montant déjà en euros", () => {
    expect(convertToEuro(123.45, "EUR")).toBe(123.45);
  });

  it("convertit les dollars avec le taux de démonstration", () => {
    expect(convertToEuro(100, "USD")).toBeCloseTo(92, 8);
  });

  it("convertit les yens avec le taux de démonstration", () => {
    expect(convertToEuro(10_000, "JPY")).toBeCloseTo(61, 8);
  });

  it("refuse une devise sans taux configuré", () => {
    expect(() => convertToEuro(10, "GBP")).toThrow(/indisponible/);
  });

  it("expose l'euro comme devise d'affichage", () => {
    expect(EURO_CURRENCY).toBe("EUR");
    expect(euroRate("EUR")).toBe(1);
  });
});
