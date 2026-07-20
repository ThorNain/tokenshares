import { describe, it, expect } from "vitest";
import { signSessionToken, verifySessionToken } from "./session-token";

const SECRET = "secret-de-test-suffisamment-long-0123456789";

describe("jetons de session", () => {
  it("signe puis vérifie un jeton valide", async () => {
    const token = await signSessionToken(
      { userId: "u1", role: "customer", email: "test@example.test" },
      SECRET,
    );
    const payload = await verifySessionToken(token, SECRET);
    expect(payload).toEqual({ userId: "u1", role: "customer", email: "test@example.test" });
  });

  it("rejette un jeton signé avec un autre secret", async () => {
    const token = await signSessionToken(
      { userId: "u1", role: "admin", email: "a@b.test" },
      SECRET,
    );
    expect(await verifySessionToken(token, "autre-secret")).toBeNull();
  });

  it("rejette un jeton altéré", async () => {
    const token = await signSessionToken(
      { userId: "u1", role: "customer", email: "a@b.test" },
      SECRET,
    );
    expect(await verifySessionToken(token.slice(0, -4) + "AAAA", SECRET)).toBeNull();
    expect(await verifySessionToken("nimporte.quoi.dutout", SECRET)).toBeNull();
  });
});
