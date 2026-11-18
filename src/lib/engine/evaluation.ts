import type { Color, GameStatus, MoveInput } from "@/lib/chess/game";
import {
  parseBestMove,
  type EngineInfo,
  type EngineScore,
  type GoLimits,
} from "@/lib/engine/uci";

/**
 * Évaluation d'une position et classement des coups.
 *
 * Stockfish donne son score du point de vue du camp au trait. Ici, tout est ramené au point de
 * vue des blancs (positif = avantage blanc), pour pouvoir comparer deux positions successives.
 */

/** Réglages de l'analyste : pleine puissance, réflexion bornée. */
export const ANALYSIS_OPTIONS = {
  UCI_LimitStrength: false,
  "Skill Level": 20,
} as const;
export const ANALYSIS_LIMITS: GoLimits = { depth: 14, movetime: 1500 };

export type PositionAnalysis = {
  /** Score du point de vue des blancs. */
  score: EngineScore;
  /** Meilleur coup selon Stockfish : donnée interne, jamais affichée au joueur. */
  bestMove: MoveInput | null;
  /** Ligne principale en coups UCI : donnée interne, jamais affichée au joueur. */
  pv: string[];
  depth: number;
};

export type MoveClass = "good" | "inaccuracy" | "mistake" | "blunder";

export const MOVE_CLASS_INFO: Record<
  MoveClass,
  { symbol: string; label: string }
> = {
  good: { symbol: "", label: "Bon coup" },
  inaccuracy: { symbol: "?!", label: "Imprécision" },
  mistake: { symbol: "?", label: "Erreur" },
  blunder: { symbol: "??", label: "Gaffe" },
};

/**
 * Seuils de perte de chances de gain (échelle de −1 à +1), repris de Lichess :
 * on perd 0,1 → imprécision, 0,2 → erreur, 0,3 → gaffe.
 */
export const CLASS_THRESHOLDS = {
  inaccuracy: 0.1,
  mistake: 0.2,
  blunder: 0.3,
} as const;

/** Ramène un score donné pour le camp `turn` au point de vue des blancs. */
export function toWhitePov(score: EngineScore, turn: Color): EngineScore {
  return turn === "w" ? score : { type: score.type, value: -score.value };
}

/** Convertit un score en centipions bornés à ±1000 ; un mat compte comme un très gros avantage. */
export function scoreToCp(score: EngineScore): number {
  if (score.type === "cp") return Math.max(-1000, Math.min(1000, score.value));
  // « mate 0 » : le camp concerné est déjà mat.
  if (score.value === 0) return -1000;
  const sign = Math.sign(score.value);
  return (
    sign * Math.min(1000, (21 - Math.min(10, Math.abs(score.value))) * 100)
  );
}

/** Chances de gain des blancs, de −1 (perdu) à +1 (gagné), à partir d'un score côté blancs. */
export function winningChances(score: EngineScore): number {
  const cp = scoreToCp(score);
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

/**
 * Classe le coup joué par `mover` en comparant l'évaluation avant et après le coup
 * (les deux du point de vue des blancs).
 */
export function classifyMove(
  before: EngineScore,
  after: EngineScore,
  mover: Color,
): MoveClass {
  const sign = mover === "w" ? 1 : -1;
  const loss = sign * (winningChances(before) - winningChances(after));
  if (loss >= CLASS_THRESHOLDS.blunder) return "blunder";
  if (loss >= CLASS_THRESHOLDS.mistake) return "mistake";
  if (loss >= CLASS_THRESHOLDS.inaccuracy) return "inaccuracy";
  return "good";
}

/** Score d'une position terminée (mat ou nulle), sans besoin du moteur. */
export function terminalScore(status: GameStatus): EngineScore | null {
  if (status.kind === "checkmate") {
    return { type: "mate", value: status.winner === "w" ? 1 : -1 };
  }
  if (status.kind === "draw") return { type: "cp", value: 0 };
  return null;
}

/**
 * Assemble l'analyse à partir des lignes du moteur : la dernière ligne `info` avec un score
 * (la plus profonde) et la ligne `bestmove`. `turn` est le camp au trait dans la position.
 */
export function buildAnalysis(
  infos: readonly EngineInfo[],
  bestMoveLine: string,
  turn: Color,
): PositionAnalysis | null {
  const last = [...infos].reverse().find((info) => info.score !== undefined);
  if (!last?.score) return null;
  return {
    score: toWhitePov(last.score, turn),
    bestMove: parseBestMove(bestMoveLine) ?? null,
    pv: last.pv,
    depth: last.depth,
  };
}
