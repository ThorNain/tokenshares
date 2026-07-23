import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" est un garde-fou d'import Next (interdit côté client) ;
      // il n'existe pas dans l'environnement de test → stub vide.
      "server-only": path.resolve(__dirname, "src/test/empty-module.ts"),
    },
  },
});
