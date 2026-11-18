import type { Square } from "chess.js";
import type { MoveInput, PromotionPiece } from "@/lib/chess/game";

/**
 * UCI (Universal Chess Interface) : le protocole texte standard pour parler à un moteur
 * d'échecs. On envoie des lignes (« position … », « go … ») et on lit ses réponses
 * (« info … », « bestmove … »). Ce fichier ne fait que traduire, sans état.
 */

export type EngineOptionValue = string | number | boolean;

export type GoLimits = {
  /** Profondeur maximale de calcul, en demi-coups. */
  depth?: number;
  /** Temps de réflexion maximal, en millisecondes. */
  movetime?: number;
};

export type EngineScore =
  { type: "cp"; value: number } | { type: "mate"; value: number };

export type EngineInfo = {
  depth: number;
  score?: EngineScore;
  /** Ligne principale, en coups UCI (ex. ["e2e4", "e7e5"]). */
  pv: string[];
};

export function setOptionCommand(
  name: string,
  value: EngineOptionValue,
): string {
  return `setoption name ${name} value ${String(value)}`;
}

export function positionCommand(fen: string): string {
  return `position fen ${fen}`;
}

export function goCommand(limits: GoLimits): string {
  const parts = ["go"];
  if (limits.depth !== undefined) parts.push("depth", String(limits.depth));
  if (limits.movetime !== undefined)
    parts.push("movetime", String(limits.movetime));
  if (parts.length === 1)
    throw new Error("goCommand : il faut une profondeur ou un temps.");
  return parts.join(" ");
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** Convertit un coup UCI (« e7e8q ») en coup de l'application ; null s'il est invalide. */
export function uciToMove(uci: string): MoveInput | null {
  const match = UCI_MOVE.exec(uci);
  if (!match) return null;
  const [, from, to, promotion] = match;
  return {
    from: from as Square,
    to: to as Square,
    ...(promotion ? { promotion: promotion as PromotionPiece } : {}),
  };
}

/**
 * Lit une ligne « bestmove … ».
 * - `undefined` : ce n'est pas une ligne bestmove ;
 * - `null` : le moteur n'a aucun coup à jouer (« bestmove (none) », partie terminée) ;
 * - sinon le coup.
 */
export function parseBestMove(line: string): MoveInput | null | undefined {
  const match = /^bestmove\s+(\S+)/.exec(line.trim());
  if (!match) return undefined;
  if (match[1] === "(none)") return null;
  return uciToMove(match[1]);
}

/** Lit une ligne « info depth … » ; renvoie null pour les autres lignes. */
export function parseInfo(line: string): EngineInfo | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== "info") return null;
  const depthIndex = tokens.indexOf("depth");
  if (depthIndex === -1) return null;

  const info: EngineInfo = { depth: Number(tokens[depthIndex + 1]), pv: [] };

  const scoreIndex = tokens.indexOf("score");
  if (scoreIndex !== -1) {
    const type = tokens[scoreIndex + 1];
    const value = Number(tokens[scoreIndex + 2]);
    if ((type === "cp" || type === "mate") && Number.isFinite(value)) {
      info.score = { type, value };
    }
  }

  const pvIndex = tokens.indexOf("pv");
  if (pvIndex !== -1) info.pv = tokens.slice(pvIndex + 1);

  return Number.isFinite(info.depth) ? info : null;
}
