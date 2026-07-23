import { describe, it, expect } from "vitest";
import { selectOrdersToTransfer } from "./chain-sync";

describe("selectOrdersToTransfer (imputation FIFO d'un transfert on-chain)", () => {
  const orders = [
    { id: "a", quantity: 1 }, // plus ancienne
    { id: "b", quantity: 2 },
    { id: "c", quantity: 1 }, // plus récente
  ];

  it("impute un transfert de 1 à la commande la plus ancienne", () => {
    expect(selectOrdersToTransfer(orders, 1)).toEqual({ orderIds: ["a"], remaining: 0 });
  });

  it("impute plusieurs commandes en FIFO jusqu'à épuisement du montant", () => {
    // 3 = a(1) + b(2)
    expect(selectOrdersToTransfer(orders, 3)).toEqual({ orderIds: ["a", "b"], remaining: 0 });
  });

  it("glouton : saute une commande trop grande mais continue à balayer", () => {
    // 2 : couvre a(1), b(2) ne rentre pas dans le reste (1), mais c(1) oui.
    expect(selectOrdersToTransfer(orders, 2)).toEqual({ orderIds: ["a", "c"], remaining: 0 });
  });

  it("ne coupe jamais une commande en deux (pas de transfert partiel)", () => {
    // Une seule commande de 5, transfert de 3 : rien n'est imputé (pas de split).
    expect(selectOrdersToTransfer([{ id: "x", quantity: 5 }], 3)).toEqual({
      orderIds: [],
      remaining: 3,
    });
  });

  it("impute toutes les commandes si le montant les couvre toutes", () => {
    expect(selectOrdersToTransfer(orders, 4)).toEqual({ orderIds: ["a", "b", "c"], remaining: 0 });
  });

  it("ne retient rien si le montant est nul ou insuffisant pour la première", () => {
    expect(selectOrdersToTransfer(orders, 0)).toEqual({ orderIds: [], remaining: 0 });
    expect(selectOrdersToTransfer([{ id: "x", quantity: 5 }], 3)).toEqual({
      orderIds: [],
      remaining: 3,
    });
  });
});
