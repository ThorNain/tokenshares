/**
 * Tests e2e — parcours client complet : connexion, achat, adresse, paiement
 * simulé (succès ET échec), confirmation webhook, portefeuille.
 *
 * Ces tests ciblent le MODE DÉMONSTRATION (connexion par e-mail seul). Quand
 * Privy est configuré, la connexion exige un code e-mail réel non
 * automatisable : la suite est alors sautée.
 */
import { test, expect } from "@playwright/test";

const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
const EMAIL = `parcours-${Date.now()}@example.test`;

test.describe.serial("Parcours d'achat complet", () => {
  test.skip(PRIVY_ENABLED, "Parcours client automatisable uniquement en mode démonstration (sans Privy).");

  test("connexion démo, commande, paiement simulé réussi, token au portefeuille", async ({
    page,
  }) => {
    // 1. Connexion (mode démonstration).
    await page.goto("/login");
    await page.getByLabel("Adresse e-mail").fill(EMAIL);
    await page.getByLabel("Prénom (optionnel)").fill("Test");
    await page.getByLabel("Nom (optionnel)").fill("E2E");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/dashboard/);

    // 2. Sélection d'un actif et achat.
    await page.goto("/assets/KO");
    await page.getByRole("button", { name: "Acheter" }).click();
    await page.waitForURL(/\/checkout\//);

    // La marge de 10 % est affichée avant paiement.
    await expect(page.getByText("Marge commerciale (10", { exact: false })).toBeVisible();

    // 3. Adresse de livraison.
    await page.getByLabel("Prénom").first().fill("Test");
    await page.getByLabel("Nom", { exact: true }).fill("E2E");
    await page.getByLabel("Adresse", { exact: true }).fill("1 rue de la Démonstration");
    await page.getByLabel("Code postal").fill("75001");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByRole("button", { name: "Enregistrer l'adresse" }).click();
    await expect(page.getByText("Adresse enregistrée.")).toBeVisible();

    // 4. Paiement simulé.
    await page.getByRole("button", { name: "Procéder au paiement (test)" }).click();
    await page.waitForURL(/\/mock-checkout\//);
    await expect(page.getByText("Page de paiement", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Simuler un paiement réussi" }).click();

    // 5. Confirmation (via le webhook simulé, jamais le retour navigateur seul).
    await page.waitForURL(/\/confirmation/);
    await expect(page.getByText("Commande confirmée")).toBeVisible({ timeout: 20_000 });

    // 6. Le token apparaît dans le portefeuille.
    await page.goto("/dashboard/portfolio");
    await expect(page.getByText("Coca-Cola")).toBeVisible();

    // 7. Le suivi affiche la timeline et le QR code.
    await page.goto("/dashboard/orders");
    await page.getByRole("link", { name: "Suivi →" }).first().click();
    await expect(page.getByText("Token transféré vers le wallet")).toBeVisible();
    await expect(page.getByText("QR code de l'objet")).toBeVisible();
  });

  test("un paiement refusé laisse la commande non confirmée", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Adresse e-mail").fill(EMAIL);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/assets/AMZN");
    await page.getByRole("button", { name: "Acheter" }).click();
    await page.waitForURL(/\/checkout\//);

    await page.getByLabel("Prénom").first().fill("Test");
    await page.getByLabel("Nom", { exact: true }).fill("E2E");
    await page.getByLabel("Adresse", { exact: true }).fill("1 rue de la Démonstration");
    await page.getByLabel("Code postal").fill("75001");
    await page.getByLabel("Ville").fill("Paris");
    await page.getByRole("button", { name: "Enregistrer l'adresse" }).click();
    await expect(page.getByText("Adresse enregistrée.")).toBeVisible();

    await page.getByRole("button", { name: "Procéder au paiement (test)" }).click();
    await page.waitForURL(/\/mock-checkout\//);
    await page.getByRole("button", { name: "Simuler un paiement refusé" }).click();
    await page.waitForURL(/\/confirmation/);
    await expect(page.getByText("Paiement non abouti")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: "Réessayer le paiement" })).toBeVisible();
  });
});
