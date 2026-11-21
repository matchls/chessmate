/**
 * Adresse du site, dont dépendent les cookies de session et la protection contre les
 * requêtes venues d'autres sites. Ordre : BETTER_AUTH_URL si fournie, sinon l'adresse
 * donnée par Vercel (aperçus), sinon le serveur local.
 */
export function resolveBaseUrl(
  env: Record<string, string | undefined>,
): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Origines acceptées : l'adresse principale, plus, sur Vercel, l'adresse du déploiement
 * et celle de la branche (un aperçu est joignable par les deux).
 */
export function trustedOrigins(
  env: Record<string, string | undefined>,
): string[] {
  const origins = new Set([resolveBaseUrl(env)]);
  for (const host of [
    env.VERCEL_URL,
    env.VERCEL_BRANCH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (host) origins.add(`https://${host}`);
  }
  return [...origins];
}
