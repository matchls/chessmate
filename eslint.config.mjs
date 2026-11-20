import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Désactive les règles de style qui entrent en conflit avec Prettier.
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // Moteur Stockfish compilé, copié tel quel (voir public/engine/README.md).
    "public/engine/**",
    // Client Prisma généré par `prisma generate` (non versionné).
    "src/generated/**",
  ]),
]);

export default eslintConfig;
