/** Adresses liées aux comptes, utilisables côté serveur comme côté navigateur. */

export const SIGN_IN_PATH = "/connexion";
export const SIGN_UP_PATH = "/inscription";
export const DEFAULT_AFTER_SIGN_IN = "/jouer";

/** Adresse de connexion qui ramène ensuite à la page demandée. */
export function signInRedirect(from: string): string {
  return `${SIGN_IN_PATH}?retour=${encodeURIComponent(from)}`;
}

/** Retour après connexion : seulement vers une page du site (pas de redirection ouverte). */
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  return value;
}
