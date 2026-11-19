/**
 * Limite de requêtes par visiteur (fenêtre glissante), gardée en mémoire du serveur.
 *
 * Limite connue : sur Vercel, chaque instance du serveur a sa propre mémoire. La limite est donc
 * approximative (un visiteur peut tomber sur plusieurs instances). Elle sera déplacée en base de
 * données avec l'issue #10. Elle suffit à empêcher un appel en boucle d'épuiser le quota.
 */

export type RateLimitResult =
  { allowed: true } | { allowed: false; retryAfterMs: number };

export type RateLimiter = (key: string, now?: number) => RateLimitResult;

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /** Nombre maximal de visiteurs suivis, pour borner la mémoire utilisée. */
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  return (key, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter(
      (time) => now - time < windowMs,
    );

    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
    }

    recent.push(now);
    hits.delete(key); // réinsertion : la Map garde l'ordre, le plus ancien visiteur sort en premier
    hits.set(key, recent);
    if (hits.size > maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }
    return { allowed: true };
  };
}

/** Réglage du coach : 20 demandes par tranche de 10 minutes et par visiteur. */
export const COACH_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * 60 * 1000,
} as const;
