import type { CSSProperties } from "react";
import type { Arrow } from "react-chessboard";
import type { CoachArrow } from "@/lib/coach/schema";

/**
 * Traduit les cases et flèches du coach dans le format de l'échiquier (react-chessboard).
 * Le coach a sa couleur (bleu), distincte du jaune du dernier coup : un contour plutôt
 * qu'un fond, pour que les deux puissent se superposer sur une même case.
 */

export const COACH_COLOR = "rgba(37, 99, 235, 0.8)";
export const COACH_SQUARE: CSSProperties = {
  boxShadow: `inset 0 0 0 4px ${COACH_COLOR}`,
};

export type SquareStyles = Record<string, CSSProperties>;

export function coachSquareStyles(highlights: readonly string[]): SquareStyles {
  const styles: SquareStyles = {};
  for (const square of highlights) styles[square] = COACH_SQUARE;
  return styles;
}

export function coachArrows(arrows: readonly CoachArrow[]): Arrow[] {
  return arrows.map(({ from, to }) => ({
    startSquare: from,
    endSquare: to,
    color: COACH_COLOR,
  }));
}

/** Superpose des styles case par case : la couche du dessus complète celle du dessous. */
export function mergeSquareStyles(
  base: SquareStyles,
  top: SquareStyles,
): SquareStyles {
  const merged: SquareStyles = { ...base };
  for (const [square, style] of Object.entries(top)) {
    merged[square] = { ...merged[square], ...style };
  }
  return merged;
}
