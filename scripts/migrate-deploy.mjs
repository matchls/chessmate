// Applique les migrations en attente (prisma migrate deploy) avant la construction sur Vercel.
// Sans DATABASE_URL (base pas encore branchée sur cet environnement), on prévient et on continue :
// le site se construit, seules les fonctions qui utilisent la base seront indisponibles.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db:deploy] DATABASE_URL absente : migrations non appliquées sur cet environnement.",
  );
  process.exit(0);
}

const result = spawnSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
