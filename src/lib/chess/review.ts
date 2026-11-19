/**
 * Revue des coups déjà joués, sans toucher à la partie en cours.
 *
 * Un seul chiffre pilote tout : le nombre de coups affichés. `null` veut dire « le direct »
 * (la dernière position) ; 0 veut dire la position de départ ; n la position après n coups.
 */

export type ReviewView = number | null;
export type ReviewAction = "first" | "prev" | "next" | "last";

/** Nombre de coups affichés sur l'échiquier. */
export function shownCount(view: ReviewView, total: number): number {
  return view === null ? total : Math.min(Math.max(view, 0), total);
}

export function isReviewing(view: ReviewView, total: number): boolean {
  return shownCount(view, total) < total;
}

/** Ramène une demande dans les bornes ; atteindre le dernier coup revient au direct. */
function toView(count: number, total: number): ReviewView {
  const bounded = Math.max(count, 0);
  return bounded >= total ? null : bounded;
}

export function navigate(
  view: ReviewView,
  total: number,
  action: ReviewAction,
): ReviewView {
  const shown = shownCount(view, total);
  switch (action) {
    case "first":
      return toView(0, total);
    case "prev":
      return toView(shown - 1, total);
    case "next":
      return toView(shown + 1, total);
    case "last":
      return null;
  }
}

/** Clic sur le coup d'indice `moveIndex` (0 = premier coup des blancs) : position après ce coup. */
export function viewAfterMove(moveIndex: number, total: number): ReviewView {
  return toView(moveIndex + 1, total);
}

const KEYS: Record<string, ReviewAction> = {
  ArrowLeft: "prev",
  ArrowRight: "next",
  Home: "first",
  End: "last",
};

export function keyToAction(key: string): ReviewAction | null {
  return KEYS[key] ?? null;
}

/** Texte du bandeau de revue, par exemple « Tu regardes le coup 4. Qf3 » ou « 4… Nd7 ». */
export function reviewLabel(
  sanHistory: readonly string[],
  shown: number,
): string {
  if (shown <= 0) return "Tu regardes la position de départ";
  const number = Math.ceil(shown / 2);
  const isWhite = shown % 2 === 1;
  const san = sanHistory[shown - 1] ?? "";
  return `Tu regardes le coup ${number}${isWhite ? "." : "…"} ${san}`;
}
