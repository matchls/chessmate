import type { MoveInput } from "@/lib/chess/game";
import type { GameSettings } from "@/lib/chess/game-settings";
import type { BotLevelId } from "@/lib/engine/levels";
import type { MoveClass } from "@/lib/engine/evaluation";

/**
 * Seconde chance : contre le bot, juste après une gaffe (??) ou une erreur (?), le joueur
 * peut rejouer son coup, un nombre limité de fois par partie. Jamais à deux. La solution
 * n'est pas montrée : rejouer, c'est chercher mieux soi-même.
 */

/** Nombre de secondes chances par partie, selon le niveau du bot (décision de Mat, 20/11). */
export const SECOND_CHANCES: Record<BotLevelId, number> = {
  800: 3,
  1000: 3,
  1200: 2,
  1500: 0,
};

/** Combien de temps le bot attend l'analyse du coup du joueur avant de jouer quand même. */
export const ANALYSIS_WAIT_MS = 3000;

export function chancesFor(settings: GameSettings): number {
  return settings.mode === "bot" ? SECOND_CHANCES[settings.level] : 0;
}

/** Ce que le bot doit faire quand c'est à lui : jouer, attendre l'analyse, ou attendre le joueur. */
export type BotGate = "play" | "wait-analysis" | "wait-decision";

const OFFERED: ReadonlySet<MoveClass> = new Set(["mistake", "blunder"]);

/**
 * À appeler quand c'est au bot de jouer, donc juste après un coup du joueur.
 * - plus de chance, ou le joueur a déjà choisi « Continuer » pour ce coup → le bot joue ;
 * - coup pas encore classé → le bot attend l'analyse ;
 * - erreur ou gaffe → le bot attend la décision du joueur (proposition affichée).
 */
export function botGate({
  settings,
  used,
  movesCount,
  settledAt,
  lastMoveClass,
}: {
  settings: GameSettings;
  used: number;
  movesCount: number;
  /** Nombre de coups au moment où le joueur a choisi « Continuer » (ou l'attente a expiré). */
  settledAt: number | null;
  lastMoveClass: MoveClass | undefined;
}): BotGate {
  if (chancesFor(settings) - used <= 0) return "play";
  if (movesCount === 0 || settledAt === movesCount) return "play";
  if (lastMoveClass === undefined) return "wait-analysis";
  return OFFERED.has(lastMoveClass) ? "wait-decision" : "play";
}

/** « Rejouer » : retire le dernier coup (celui du joueur). */
export function withoutLastMove(moves: readonly MoveInput[]): MoveInput[] {
  return moves.slice(0, -1);
}

export function offerMessage(moveClass: "mistake" | "blunder"): string {
  return moveClass === "blunder"
    ? "Gaffe (??) : ce coup te coûte cher. Veux-tu le rejouer ?"
    : "Erreur (?) : il y avait nettement mieux. Veux-tu le rejouer ?";
}

export function chancesLabel(remaining: number, total: number): string {
  return `Secondes chances : ${remaining}/${total}`;
}
