import { defineConfig } from "prisma/config";

/**
 * Configuration de Prisma (v7) : schéma, migrations et base.
 * L'adresse de la base vient de DATABASE_URL (.env.local en local, variables Vercel ailleurs) ;
 * absente, seules les commandes sans base marchent (generate, validate), ce qui suffit à la CI.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Pas de .env.local (CI, Vercel) : les variables viennent de l'environnement.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
