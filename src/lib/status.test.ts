import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  MINT_STATUSES,
  MINT_STATUS_LABELS,
  HEDGING_STATUSES,
  asOrderStatus,
  asMintStatus,
  asHedgingStatus,
  asErrorSeverity,
} from "./status";

describe("statuts métier", () => {
  it("chaque statut de commande a un libellé français", () => {
    for (const s of ORDER_STATUSES) {
      expect(ORDER_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("les statuts de mint couvrent le cycle complet exigé", () => {
    for (const required of [
      "not_started",
      "queued",
      "minting",
      "mint_submitted",
      "mint_confirmed",
      "transfer_pending",
      "transfer_submitted",
      "transfer_confirmed",
      "failed",
      "cancelled",
    ]) {
      expect(MINT_STATUSES).toContain(required);
      expect(MINT_STATUS_LABELS[required as (typeof MINT_STATUSES)[number]]).toBeTruthy();
    }
  });

  it("les statuts de couverture correspondent au cahier des charges", () => {
    expect(HEDGING_STATUSES).toEqual([
      "not_started",
      "pending",
      "processing",
      "simulated_filled",
      "failed",
      "cancelled",
    ]);
  });

  it("coerce les valeurs inconnues vers un défaut sûr", () => {
    expect(asOrderStatus("n'importe quoi")).toBe("created");
    expect(asMintStatus("xxx")).toBe("not_started");
    expect(asHedgingStatus("")).toBe("not_started");
    expect(asErrorSeverity("fatal")).toBe("error");
  });

  it("préserve les valeurs valides", () => {
    expect(asOrderStatus("minted")).toBe("minted");
    expect(asMintStatus("transfer_confirmed")).toBe("transfer_confirmed");
  });
});
