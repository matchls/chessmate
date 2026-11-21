/**
 * Calcul Elo standard : un pari pesé sur la force des deux joueurs. Avant la partie, la formule
 * estime le score attendu ; après, on compare au résultat. Une victoire inattendue rapporte
 * beaucoup, une défaite attendue coûte peu. Le bot compte comme un adversaire de son niveau.
 */

export const ELO_FLOOR = 100;
/** Les premières parties bougent plus vite, pour placer le joueur à son niveau. */
export const PROVISIONAL_GAMES = 20;
export const K_PROVISIONAL = 40;
export const K_STANDARD = 20;

/** Score attendu (entre 0 et 1) d'un joueur face à un adversaire. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export type EloResult = { before: number; after: number; delta: number };

/**
 * Nouvel Elo après une partie. `score` : 1 victoire, 0,5 nulle, 0 défaite.
 * `countedGames` : nombre de parties déjà comptées pour l'Elo (coefficient de départ).
 */
export function eloAfterGame({
  rating,
  opponent,
  score,
  countedGames,
}: {
  rating: number;
  opponent: number;
  score: 0 | 0.5 | 1;
  countedGames: number;
}): EloResult {
  const k = countedGames < PROVISIONAL_GAMES ? K_PROVISIONAL : K_STANDARD;
  const raw = Math.round(k * (score - expectedScore(rating, opponent)));
  const after = Math.max(ELO_FLOOR, rating + raw);
  return { before: rating, after, delta: after - rating };
}
