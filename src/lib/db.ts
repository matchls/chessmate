import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Accès à la base, côté serveur uniquement (jamais importé par un composant client).
 * Un seul client par processus : en développement, le rechargement à chaud de Next.js
 * recréerait sinon une connexion à chaque modification de fichier.
 */

const globalForDb = globalThis as unknown as { chessmateDb?: PrismaClient };

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL absente : la base n'est pas configurée.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function createDb(connectionString: string | undefined): PrismaClient {
  if (!connectionString) throw new DatabaseNotConfiguredError();
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
}

export function getDb(): PrismaClient {
  globalForDb.chessmateDb ??= createDb(process.env.DATABASE_URL);
  return globalForDb.chessmateDb;
}
