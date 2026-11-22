import { Chess, type Square } from "chess.js";

export type Color = "w" | "b";
export type PromotionPiece = "q" | "r" | "b" | "n";

/** Un coup au format « case de départ → case d'arrivée » (+ pièce de promotion). */
export type MoveInput = {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
};

export type DrawReason =
  "stalemate" | "insufficient-material" | "threefold" | "fifty-moves";

export type GameStatus =
  | { kind: "playing"; turn: Color; check: boolean }
  | { kind: "checkmate"; winner: Color }
  | { kind: "draw"; reason: DrawReason }
  | { kind: "resigned"; winner: Color }
  /** Temps écoulé ; `winner` null : l'adversaire ne peut pas mater, la partie est nulle. */
  | { kind: "timeout"; winner: Color | null };

export type MoveResult =
  { ok: true; moves: MoveInput[]; san: string } | { ok: false };

export const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

/**
 * Reconstruit une partie à partir de la liste des coups joués.
 * La partie est entièrement décrite par ses coups : rejouer la liste redonne la même position,
 * avec l'historique nécessaire à la détection de la triple répétition.
 */
export function replay(moves: readonly MoveInput[], startFen?: string): Chess {
  const game = new Chess(startFen);
  for (const move of moves) {
    game.move(move);
  }
  return game;
}

/** Tente un coup ; renvoie la nouvelle liste de coups si le coup est légal. Ne modifie rien. */
export function tryMove(
  moves: readonly MoveInput[],
  move: MoveInput,
  startFen?: string,
): MoveResult {
  const game = replay(moves, startFen);
  try {
    const played = game.move(move);
    return { ok: true, moves: [...moves, move], san: played.san };
  } catch {
    return { ok: false };
  }
}

/** Cases où la pièce posée sur `square` peut aller (vide si aucune pièce du camp au trait). */
export function legalTargets(game: Chess, square: Square): Square[] {
  return game.moves({ square, verbose: true }).map((move) => move.to);
}

/** Vrai si le coup from → to est légal et nécessite de choisir une pièce de promotion. */
export function needsPromotion(game: Chess, from: Square, to: Square): boolean {
  return game
    .moves({ square: from, verbose: true })
    .some((move) => move.to === to && move.promotion !== undefined);
}

/** Vrai si une pièce du camp au trait est posée sur `square`. */
export function isOwnPiece(game: Chess, square: Square): boolean {
  return game.get(square)?.color === game.turn();
}

/**
 * État de la partie. `resignedBy` : camp qui a abandonné ; `flaggedBy` : camp tombé au temps
 * (null : personne). Un mat ou une nulle déjà sur l'échiquier l'emporte : on n'abandonne pas,
 * on ne perd pas au temps une partie déjà finie. Seul le camp au trait peut tomber au temps.
 */
export function getStatus(
  game: Chess,
  resignedBy: Color | null = null,
  flaggedBy: Color | null = null,
): GameStatus {
  const status = boardStatus(game);
  if (status.kind !== "playing") return status;
  if (resignedBy) {
    return { kind: "resigned", winner: resignedBy === "w" ? "b" : "w" };
  }
  if (flaggedBy && flaggedBy === game.turn()) {
    const opponent: Color = flaggedBy === "w" ? "b" : "w";
    return {
      kind: "timeout",
      winner: hasMatingMaterial(game, opponent) ? opponent : null,
    };
  }
  return status;
}

/**
 * Vrai si `color` garde de quoi mater : un pion, une tour, une dame, ou au moins deux pièces
 * mineures. Roi seul, ou roi + un seul fou ou cavalier : pas de mat possible, donc un temps
 * écoulé de l'adversaire donne une partie nulle (règle simplifiée).
 */
export function hasMatingMaterial(game: Chess, color: Color): boolean {
  let minors = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue;
      if (cell.type === "p" || cell.type === "r" || cell.type === "q") {
        return true;
      }
      if (cell.type === "b" || cell.type === "n") minors += 1;
    }
  }
  return minors >= 2;
}

function boardStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) {
    return { kind: "checkmate", winner: game.turn() === "w" ? "b" : "w" };
  }
  if (game.isStalemate()) return { kind: "draw", reason: "stalemate" };
  if (game.isInsufficientMaterial())
    return { kind: "draw", reason: "insufficient-material" };
  if (game.isThreefoldRepetition())
    return { kind: "draw", reason: "threefold" };
  if (game.isDrawByFiftyMoves()) return { kind: "draw", reason: "fifty-moves" };
  return { kind: "playing", turn: game.turn(), check: game.inCheck() };
}

const COLOR_LABEL: Record<Color, string> = { w: "blancs", b: "noirs" };

const DRAW_LABEL: Record<DrawReason, string> = {
  stalemate: "Pat : partie nulle",
  "insufficient-material": "Matériel insuffisant : partie nulle",
  threefold: "Triple répétition : partie nulle",
  "fifty-moves": "Règle des 50 coups : partie nulle",
};

/** Texte affiché au joueur pour l'état de la partie. */
export function statusLabel(status: GameStatus): string {
  switch (status.kind) {
    case "checkmate":
      return `Échec et mat : les ${COLOR_LABEL[status.winner]} gagnent`;
    case "draw":
      return DRAW_LABEL[status.reason];
    case "resigned":
      return `Les ${COLOR_LABEL[status.winner]} gagnent par abandon`;
    case "timeout":
      return status.winner
        ? `Temps écoulé : les ${COLOR_LABEL[status.winner]} gagnent`
        : "Temps écoulé, mais pas de mat possible : partie nulle";
    case "playing":
      return `${status.check ? "Échec ! " : ""}Aux ${COLOR_LABEL[status.turn]} de jouer`;
  }
}

export type MovePair = { number: number; white: string; black?: string };

/** Regroupe l'historique SAN par paires numérotées : 1. e4 e5, 2. Nf3 Nc6… */
export function toMovePairs(sanHistory: readonly string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < sanHistory.length; i += 2) {
    pairs.push({
      number: i / 2 + 1,
      white: sanHistory[i],
      black: sanHistory[i + 1],
    });
  }
  return pairs;
}

/** Case du roi du camp au trait, s'il est en échec (pour la surligner). */
export function checkedKingSquare(game: Chess): Square | undefined {
  if (!game.inCheck()) return undefined;
  const turn = game.turn();
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === turn) return cell.square;
    }
  }
  return undefined;
}

export type PositionSnapshot = { fen: string; turn: Color; status: GameStatus };

/**
 * Toutes les positions de la partie, de la position de départ (indice 0) à la position
 * actuelle (indice = nombre de coups). Le coup n°i fait passer de la position i−1 à la position i.
 */
export function positionsOf(
  moves: readonly MoveInput[],
  startFen?: string,
): PositionSnapshot[] {
  const game = new Chess(startFen);
  const snapshot = (): PositionSnapshot => ({
    fen: game.fen(),
    turn: game.turn(),
    status: getStatus(game),
  });
  const positions = [snapshot()];
  for (const move of moves) {
    game.move(move);
    positions.push(snapshot());
  }
  return positions;
}
