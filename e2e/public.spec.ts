/**
 * Tests e2e — pages publiques & protection des routes.
 * Prérequis : npm run seed (données ORD-DEMO01…08), serveur démarré par la
 * config Playwright.
 */
import { test, expect } from "@playwright/test";

test.describe("Pages publiques", () => {
  test("la bannière de prototype est visible partout", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("Prototype de démonstration — aucun investissement réel", { exact: false }),
    ).toBeVisible();
  });

  test("le catalogue affiche les actifs et filtre par nom", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.getByText("Apple")).toBeVisible();
    await expect(page.getByText("LVMH")).toBeVisible();
    await page.getByLabel("Rechercher un actif").fill("Toyota");
    await expect(page.getByText("Toyota")).toBeVisible();
    await expect(page.getByText("Apple")).toHaveCount(0);
  });

  test("le filtre par indice restreint la liste", async ({ page }) => {
    await page.goto("/assets");
    await page.getByLabel("Filtrer par indice").selectOption("CAC40");
    await expect(page.getByText("TotalEnergies")).toBeVisible();
    await expect(page.getByText("Microsoft")).toHaveCount(0);
  });

  test("la fiche actif affiche prix indicatif, marge et prix final", async ({ page }) => {
    await page.goto("/assets/AAPL");
    await expect(page.getByText("Prix indicatif de l'action")).toBeVisible();
    await expect(page.getByText("Marge commerciale (10")).toBeVisible();
    await expect(page.getByText("Prix final par token")).toBeVisible();
    await expect(page.getByText("aucune action réelle n'est achetée", { exact: false })).toBeVisible();
  });
});

test.describe("Protection des routes", () => {
  test("l'admin est inaccessible sans session (redirection login)", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("l'API admin renvoie 403 sans session", async ({ request }) => {
    const res = await request.get("/api/admin/orders/export?format=json");
    expect(res.status()).toBe(403);
  });

  test("un client connecté ne peut pas accéder à l'administration", async ({ page }) => {
    // Connexion démo côté client (indisponible si Privy est actif).
    test.skip(
      Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID),
      "Connexion client automatisable uniquement en mode démonstration (sans Privy).",
    );
    await page.goto("/login");
    await page.getByLabel("Adresse e-mail").fill("client-e2e@example.test");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/dashboard/);
    // Tentative d'accès admin → renvoyé vers la connexion admin.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    const res = await page.request.get("/api/admin/orders/export?format=json");
    expect(res.status()).toBe(403);
  });

  test("le tableau de bord exige une connexion", async ({ page }) => {
    await page.goto("/dashboard/portfolio");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("QR code / claim", () => {
  test("un jeton inconnu affiche un message d'erreur sans fuite d'information", async ({ page }) => {
    await page.goto("/claim/jeton-inexistant-123");
    await expect(page.getByText("associé à aucune commande", { exact: false })).toBeVisible();
  });
});
