import { describe, it, expect } from "vitest";
import {
  calculateSellingPrice,
  calculateMarginAmount,
  computeOrderLine,
  roundCurrency,
  toMinorUnits,
  fromMinorUnits,
  isZeroDecimalCurrency,
  DEFAULT_MARGIN_RATE,
} from "./pricing";

describe("calculateSellingPrice", () => {
  it("applique la marge de 10 % (exemple du cahier des charges : 200 € → 220 €)", () => {
    expect(calculateSellingPrice(200, 0.1)).toBeCloseTo(220);
    expect(calculateMarginAmount(200, 0.1)).toBeCloseTo(20);
  });

  it("utilise un taux par défaut de 10 %", () => {
    expect(DEFAULT_MARGIN_RATE).toBe(0.1);
  });

  it("accepte un taux de marge configurable", () => {
    expect(calculateSellingPrice(100, 0.05)).toBeCloseTo(105);
    expect(calculateSellingPrice(100, 0)).toBeCloseTo(100);
  });

  it("rejette les prix invalides", () => {
    expect(() => calculateSellingPrice(0, 0.1)).toThrow();
    expect(() => calculateSellingPrice(-5, 0.1)).toThrow();
    expect(() => calculateSellingPrice(Number.NaN, 0.1)).toThrow();
  });

  it("rejette les taux de marge hors bornes", () => {
    expect(() => calculateSellingPrice(100, -0.1)).toThrow();
    expect(() => calculateSellingPrice(100, 1.5)).toThrow();
    expect(() => calculateSellingPrice(100, Number.NaN)).toThrow();
  });
});

describe("roundCurrency / devises", () => {
  it("arrondit à 2 décimales pour EUR/USD", () => {
    expect(roundCurrency(10.005, "EUR")).toBeCloseTo(10.01);
    expect(roundCurrency(10.004, "USD")).toBeCloseTo(10.0);
  });

  it("arrondit à l'unité pour JPY (devise zéro décimale)", () => {
    expect(isZeroDecimalCurrency("JPY")).toBe(true);
    expect(roundCurrency(2850.6, "JPY")).toBe(2851);
  });

  it("rejette les montants non finis", () => {
    expect(() => roundCurrency(Number.POSITIVE_INFINITY, "EUR")).toThrow();
  });
});

describe("computeOrderLine", () => {
  it("calcule sous-total, marge et total pour une quantité > 1", () => {
    const line = computeOrderLine({ marketPrice: 200, quantity: 2, marginRate: 0.1, currency: "EUR" });
    expect(line.unitSellingPrice).toBeCloseTo(220);
    expect(line.subtotal).toBeCloseTo(400);
    expect(line.total).toBeCloseTo(440);
    expect(line.marginAmount).toBeCloseTo(40);
  });

  it("reste cohérent en JPY (montants entiers)", () => {
    const line = computeOrderLine({ marketPrice: 2851, quantity: 3, marginRate: 0.1, currency: "JPY" });
    expect(Number.isInteger(line.unitSellingPrice)).toBe(true);
    expect(Number.isInteger(line.total)).toBe(true);
    expect(line.total).toBe(line.unitSellingPrice * 3);
  });

  it("rejette les quantités invalides", () => {
    expect(() => computeOrderLine({ marketPrice: 100, quantity: 0, marginRate: 0.1, currency: "EUR" })).toThrow();
    expect(() => computeOrderLine({ marketPrice: 100, quantity: 1.5, marginRate: 0.1, currency: "EUR" })).toThrow();
    expect(() => computeOrderLine({ marketPrice: 100, quantity: 101, marginRate: 0.1, currency: "EUR" })).toThrow();
  });
});

describe("conversions Stripe (unités mineures)", () => {
  it("convertit EUR en centimes et inversement", () => {
    expect(toMinorUnits(220, "EUR")).toBe(22000);
    expect(fromMinorUnits(22000, "EUR")).toBeCloseTo(220);
  });

  it("ne multiplie pas les devises zéro décimale", () => {
    expect(toMinorUnits(3135, "JPY")).toBe(3135);
    expect(fromMinorUnits(3135, "JPY")).toBe(3135);
  });
});
