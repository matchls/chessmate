import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/auth";

/**
 * Porte d'entrée de Better Auth : inscription, connexion (e-mail ou pseudo), déconnexion,
 * session. Toutes les entrées sont revérifiées ici, côté serveur.
 */
export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request);
}
