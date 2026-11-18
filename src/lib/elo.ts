/** Score attendu du joueur face à un adversaire (formule Elo). */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - rating) / 40));
}

/** Nouvel Elo après une partie (score : 1 victoire, 0,5 nulle, 0 défaite). */
export function newRating(
  rating: number,
  opponent: number,
  score: number,
): number {
  const k = 32;
  return Math.round(rating + k * (expectedScore(rating, opponent) - score));
}
