import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Configuration du banc d'essai du coach (`pnpm coach:bench`), séparée des tests rapides. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/lib/coach/bench/*.run.ts"],
  },
});
