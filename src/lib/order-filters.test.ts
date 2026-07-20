import { describe, it, expect } from "vitest";
import { buildOrderWhere, buildOrderOrderBy, parsePagination, QUICK_FILTERS } from "./order-filters";

describe("buildOrderWhere", () => {
  it("retourne un filtre vide sans paramètres", () => {
    expect(buildOrderWhere({})).toEqual({});
  });

  it("filtre par ticker via la relation items→asset", () => {
    const where = buildOrderWhere({ ticker: "AAPL" }) as { AND: unknown[] };
    expect(where.AND).toContainEqual({ items: { some: { asset: { ticker: "AAPL" } } } });
  });

  it("combine e-mail, statut et dates", () => {
    const where = buildOrderWhere({
      email: "claire",
      status: "paid",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    }) as { AND: unknown[] };
    expect(where.AND).toHaveLength(4);
    expect(where.AND).toContainEqual({ user: { email: { contains: "claire" } } });
    expect(where.AND).toContainEqual({ status: "paid" });
  });

  it("le filtre rapide « errors » couvre paiement, couverture et mint", () => {
    const where = buildOrderWhere({ quick: "errors" }) as {
      AND: [{ OR: unknown[] }];
    };
    expect(where.AND[0].OR).toContainEqual({ payment: { status: "failed" } });
    expect(where.AND[0].OR).toContainEqual({ hedgingOrder: { status: "failed" } });
    expect(where.AND[0].OR).toContainEqual({ tokenMint: { status: "failed" } });
  });

  it("ignore les dates invalides", () => {
    expect(buildOrderWhere({ dateFrom: "pas-une-date" })).toEqual({});
  });

  it("expose les 13 filtres rapides exigés", () => {
    expect(QUICK_FILTERS).toHaveLength(13);
  });
});

describe("tri et pagination", () => {
  it("trie par défaut du plus récent au plus ancien", () => {
    expect(buildOrderOrderBy(undefined)).toEqual({ createdAt: "desc" });
    expect(buildOrderOrderBy("total_desc")).toEqual({ totalAmount: "desc" });
  });

  it("borne la pagination", () => {
    expect(parsePagination({ page: "0", pageSize: "5000" })).toEqual({ page: 1, pageSize: 100 });
    expect(parsePagination({ page: "3", pageSize: "50" })).toEqual({ page: 3, pageSize: 50 });
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 25 });
  });
});
