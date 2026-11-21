import type { Color } from "@/lib/chess/game";
import type { ExplainResponse, ExplainStep } from "@/lib/coach/schema";
import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/engine/evaluation";

/**
 * Règles de l'explication d'un coup signalé, côté écran (fonctions pures, testées).
 */

/** Camp qui a joué le coup d'indice `moveIndex` (0 = premier coup des blancs). */
export function moverOf(moveIndex: number): Color {
  return moveIndex % 2 === 0 ? "w" : "b";
}

/**
 * Peut-on demander « Pourquoi ? » sur ce coup ? Il faut qu'il soit signalé (pas « bon ») et,
 * que ce soit un coup du joueur (pas un coup du bot).
 */
export function canExplain({
  moveIndex,
  moveClass,
  playerColor,
}: {
  moveIndex: number;
  moveClass: MoveClass | undefined;
  playerColor: Color;
}): boolean {
  if (moveIndex < 0 || !moveClass || moveClass === "good") return false;
  return moverOf(moveIndex) === playerColor;
}

/** « 4. Qf3?! » ou « 3… Nf6?? » : le coup expliqué, avec son symbole. */
export function explainHeading(
  moveIndex: number,
  san: string,
  moveClass: Exclude<MoveClass, "good">,
): string {
  const number = Math.floor(moveIndex / 2) + 1;
  const dots = moverOf(moveIndex) === "w" ? "." : "…";
  return `${number}${dots} ${san}${MOVE_CLASS_INFO[moveClass].symbol}`;
}

/** Texte du bouton « Pourquoi ? », selon le classement du coup. */
export function whyLabel(moveClass: Exclude<MoveClass, "good">): string {
  return `Pourquoi est-ce une ${MOVE_CLASS_INFO[moveClass].label.toLowerCase()} ?`;
}

export type Explanation = {
  /** Coup expliqué, et nombre de coups de la partie au moment de la demande. */
  moveIndex: number;
  total: number;
  step: ExplainStep;
  why?: ExplainResponse;
  solution?: ExplainResponse;
  loading: boolean;
  error: string | null;
};

/** Ce que l'échiquier doit montrer pendant l'explication : nombre de coups affichés. */
export function explanationView(explanation: Explanation): number {
  return explanation.step === "why"
    ? explanation.moveIndex + 1
    : explanation.moveIndex;
}

/** Réponse dont les visuels s'affichent sur l'échiquier. */
export function explanationVisuals(
  explanation: Explanation,
): ExplainResponse | undefined {
  return explanation.step === "why" ? explanation.why : explanation.solution;
}
