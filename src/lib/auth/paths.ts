/** Adresses liées aux comptes, utilisables côté serveur comme côté navigateur. */

export const SIGN_IN_PATH = "/connexion";
export const SIGN_UP_PATH = "/inscription";
export const DEFAULT_AFTER_SIGN_IN = "/jouer";

/** Adresse de connexion qui ramène ensuite à la page demandée. */
export function signInRedirect(from: string): string {
  return `${SIGN_IN_PATH}?retour=${encodeURIComponent(from)}`;
}

const LOCAL_ORIGIN = "https://chessmate.invalid";

/**
 * Retour après connexion : seulement vers une page du site (pas de redirection ouverte).
 * On refuse les caractères que le navigateur ignore ou réinterprète (tabulation, retour à la
 * ligne, « \ »), puis on laisse l'analyseur d'URL trancher : la destination doit rester sur
 * le site.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\u0000-\u001f\\]/.test(value)
  ) {
    return DEFAULT_AFTER_SIGN_IN;
  }
  try {
    const url = new URL(value, LOCAL_ORIGIN);
    if (url.origin !== LOCAL_ORIGIN) return DEFAULT_AFTER_SIGN_IN;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AFTER_SIGN_IN;
  }
}
