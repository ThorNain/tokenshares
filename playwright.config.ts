import { defineConfig } from "@playwright/test";

/**
 * Tests end-to-end. Le serveur Next est démarré automatiquement.
 * Prérequis : `npm run seed` puis `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
