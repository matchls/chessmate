import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/auth";
import { signInRedirect } from "@/lib/auth/paths";

/** Joueur connecté, tel que l'écran en a besoin. */
export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  elo: number;
};

type SessionLike = {
  user: {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    displayUsername?: string | null;
    elo?: number | null;
  };
} | null;

/** Transforme la session de Better Auth en joueur connecté (null : invité). */
export function toCurrentUser(session: SessionLike): CurrentUser | null {
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    email: user.email,
    username: user.displayUsername ?? user.username ?? user.name,
    elo: user.elo ?? 600,
  };
}

/** Joueur connecté, ou null (mode invité, ou base pas encore configurée). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.DATABASE_URL) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  return toCurrentUser(session);
}

/**
 * Pour les pages réservées aux comptes : vérifié côté serveur, à chaque requête.
 * Sans session, redirection vers la connexion (jamais de contenu envoyé).
 */
export async function requireUser(from: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInRedirect(from));
  return user;
}
