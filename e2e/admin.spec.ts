/**
 * Tests e2e — interface entreprise (section 30) : liste des commandes,
 * recherches, filtres, fiche détaillée, relance d'opération, exports,
 * réserves, erreurs.
 * Prérequis : npm run seed (ORD-DEMO01…08) + .env par défaut.
 */
import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@example.test";
const ADMIN_PASSWORD = "demo-admin-2026!";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(ADMIN_EMAIL);
  await page.getByLabel("Mot de passe").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Interface entreprise", () => {
  test("tableau de bord : indicateurs commerciaux et opérationnels", async ({ page }) => {
    await adminLogin(page);
    await expect(page.getByText("Indicateurs commerciaux")).toBeVisible();
    await expect(page.getByText("Commandes (total)")).toBeVisible();
    await expect(page.getByText("Paiements en attente")).toBeVisible();
    await expect(page.getByText("Répartition par indice")).toBeVisible();
  });

  test("liste des commandes : affichage et recherche par e-mail", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders");
    await expect(page.getByRole("link", { name: "ORD-DEMO01" })).toBeVisible();

    // Recherche par e-mail du client de démonstration.
    await page.goto("/admin/orders?email=claire.dupont%40example.test");
    await expect(page.getByRole("link", { name: "ORD-DEMO01" })).toBeVisible();
    await expect(page.getByText("claire.dupont@example.test").first()).toBeVisible();
  });

  test("recherche par nom et par identifiant produit", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?client=Dupont");
    await expect(page.getByRole("link", { name: "ORD-DEMO01" })).toBeVisible();
    await page.goto("/admin/orders?q=ORD-DEMO05");
    await expect(page.getByRole("link", { name: "ORD-DEMO05" })).toBeVisible();
  });

  test("filtres par ticker et par statut", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?ticker=AAPL");
    await expect(page.getByRole("link", { name: "ORD-DEMO01" })).toBeVisible();
    await page.goto("/admin/orders?mintStatus=failed");
    await expect(page.getByRole("link", { name: "ORD-DEMO05" })).toBeVisible();
  });

  test("fiche détaillée : informations client, progression, erreur blockchain", async ({
    page,
  }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?q=ORD-DEMO05");
    await page.getByRole("link", { name: "ORD-DEMO05" }).click();
    await expect(page.getByText("claire.dupont@example.test").first()).toBeVisible();
    await expect(page.getByText("Progression de la commande")).toBeVisible();
    await expect(page.getByText("Achat de couverture (simulé)")).toBeVisible();
    await expect(page.getByText("Erreur RPC simulée", { exact: false }).first()).toBeVisible();
  });

  test("relance d'une émission échouée (ORD-DEMO05)", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?q=ORD-DEMO05");
    await page.getByRole("link", { name: "ORD-DEMO05" }).click();
    await page.getByRole("button", { name: "Relancer l'émission du token" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    // Après relance réussie, le mint passe en transfert confirmé.
    await expect(page.getByText("Transfert confirmé").first()).toBeVisible({ timeout: 20_000 });
  });

  test("modification du statut de livraison (ORD-DEMO07)", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?q=ORD-DEMO07");
    await page.getByRole("link", { name: "ORD-DEMO07" }).click();
    await page.getByRole("button", { name: "Marquer comme expédiée" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByText("● Expédiée").first()).toBeVisible({ timeout: 20_000 });
  });

  test("génération / régénération du QR code (ORD-DEMO03)", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/orders?q=ORD-DEMO03");
    await page.getByRole("link", { name: "ORD-DEMO03" }).click();
    await page.getByRole("button", { name: "Générer le QR code" }).click();
    await page.getByRole("button", { name: "Confirmer" }).click();
    await expect(page.getByAltText(/QR code de la commande/)).toBeVisible({ timeout: 20_000 });
  });

  test("export CSV avec les filtres actifs", async ({ page }) => {
    await adminLogin(page);
    const res = await page.request.get("/api/admin/orders/export?format=csv&ticker=AAPL");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const body = await res.text();
    expect(body).toContain("ID public");
    expect(body).toContain("AAPL");
  });

  test("réserves : rapprochement couverture / tokens affiché", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/reserves");
    await expect(page.getByText("coverageRatio", { exact: false })).toBeVisible();
    await expect(page.getByText("Tokens émis")).toBeVisible();
    // La commande remboursée après mint du seed doit lever une alerte.
    await expect(page.getByText("remboursée", { exact: false }).first()).toBeVisible();
  });

  test("page erreurs : l'erreur blockchain du seed est listée", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/errors?service=blockchain");
    await expect(page.getByText("mint_failed").first()).toBeVisible();
    await expect(page.getByText("● Critique").first()).toBeVisible();
  });
});
