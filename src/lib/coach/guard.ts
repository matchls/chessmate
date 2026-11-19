import { Chess, type Square } from "chess.js";
import type { MoveInput } from "@/lib/chess/game";
import {
  isSquare,
  modelReplySchema,
  type CoachArrow,
  type CoachResponse,
  type HintLevel,
} from "@/lib/coach/schema";

/**
 * Garde-fou : chaque réponse du modèle passe ici avant d'être renvoyée au joueur.
 * On ne fait jamais aveuglément confiance au modèle :
 * - réponse illisible ou hors format → réponse de secours ;
 * - cases inexistantes, flèches incohérentes avec la position → retirées ;
 * - meilleur coup révélé (texte ou flèche) → réponse de secours.
 */

export type GuardContext = {
  fen: string;
  hintLevel: HintLevel;
  /** Meilleur coup selon Stockfish : ce que le coach ne doit jamais révéler. */
  bestMove?: MoveInput | null;
};

export type GuardResult = CoachResponse & {
  /** Ce qui a été corrigé, pour le journal du serveur et le banc d'essai. */
  issues: GuardIssue[];
};

export type GuardIssue =
  | "invalid-json"
  | "invalid-shape"
  | "dropped-highlight"
  | "dropped-arrow"
  | "leak-arrow"
  | "leak-highlight"
  | "leak-message";

const MAX_HIGHLIGHTS = 4;
const MAX_ARROWS = 2;

const FALLBACK_MESSAGE: Record<HintLevel, string> = {
  1: "Prends le temps de faire le tour de l'échiquier : quelles pièces adverses sont mal protégées, et lesquelles des tiennes le sont ? Qu'est-ce qui menace ton roi ?",
  2: "Regarde chacune de tes pièces : laquelle pourrait attaquer quelque chose ou se rendre plus utile ? Et quelle pièce adverse a le moins de défenseurs ?",
  3: "Cherche un coup qui crée une menace : une prise, un échec, ou une attaque sur deux cibles à la fois. Lequel de tes coups oblige l'adversaire à réagir ?",
};

/** Retire les éventuels blocs ```json … ``` autour de la réponse. */
function extractJson(raw: string): unknown {
  const trimmed = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(trimmed);
}

/** Noms des pièces tels qu'ils apparaissent dans un message (« dame », « cavalier »…). */
const PIECE_NAMES: Record<string, string> = {
  p: "pion",
  n: "cavalier",
  b: "fou",
  r: "tour",
  q: "dame",
  k: "roi",
};

/** Lettres des pièces en anglais (notation de chess.js) et en français. */
const FRENCH_PIECE: Record<string, string> = {
  N: "C",
  B: "F",
  R: "T",
  Q: "D",
  K: "R",
};

/** Les écritures du meilleur coup qu'on ne doit jamais retrouver dans le message. */
export function bestMoveSpellings(fen: string, bestMove: MoveInput): string[] {
  const game = new Chess(fen);
  let san: string;
  try {
    san = game.move(bestMove).san.replace(/[+#]/g, "");
  } catch {
    return [];
  }
  const spellings = new Set([
    san,
    san.replace("x", ""),
    `${bestMove.from}${bestMove.to}`,
  ]);
  const piece = san[0];
  if (FRENCH_PIECE[piece]) {
    spellings.add(FRENCH_PIECE[piece] + san.slice(1));
    spellings.add(FRENCH_PIECE[piece] + san.slice(1).replace("x", ""));
  }
  return [...spellings];
}

/** Vrai si le message révèle le meilleur coup (notation, ou cases de départ ET d'arrivée). */
export function messageLeaksMove(
  message: string,
  fen: string,
  bestMove: MoveInput,
): boolean {
  const text = message.toLowerCase();
  const spelled = bestMoveSpellings(fen, bestMove).some((spelling) =>
    new RegExp(`(^|[^a-z0-9])${spelling.toLowerCase()}($|[^a-z0-9])`).test(
      text,
    ),
  );
  const mentions = (word: string) =>
    new RegExp(`(^|[^a-zà-ÿ0-9])${word}($|[^a-zà-ÿ0-9])`).test(text);
  if (spelled || !mentions(bestMove.to)) return spelled;
  // La case d'arrivée est citée : c'est une fuite si on désigne aussi la pièce qui y va,
  // par sa case de départ (« b5 … c7 ») ou par son nom (« ta dame … f7 »).
  const piece = new Chess(fen).get(bestMove.from);
  const pieceName = piece ? PIECE_NAMES[piece.type] : undefined;
  return (
    mentions(bestMove.from) || (pieceName !== undefined && mentions(pieceName))
  );
}

/** Une flèche est cohérente si une pièce est sur la case de départ et attaque la case d'arrivée. */
function arrowMakesSense(game: Chess, from: Square, to: Square): boolean {
  const piece = game.get(from);
  if (!piece || from === to) return false;
  if (game.attackers(to, piece.color).includes(from)) return true;
  if (piece.color === game.turn()) {
    return game
      .moves({ square: from, verbose: true })
      .some((move) => move.to === to);
  }
  return false;
}

/**
 * Cases surlignées qui donneraient le coup. Surligner la pièce à jouer ET sa case d'arrivée,
 * c'est montrer le coup. Règles :
 * - niveau 1 : ni la pièce à jouer, ni sa case d'arrivée ;
 * - niveaux 2 et 3 : la pièce à jouer, ou la pièce à prendre si le coup est une prise,
 *   mais jamais les deux ; jamais une case d'arrivée vide.
 */
export function leakingHighlights(
  highlights: readonly Square[],
  game: Chess,
  best: MoveInput,
  hintLevel: HintLevel,
): Square[] {
  const leaking: Square[] = [];
  const showsPiece = highlights.includes(best.from);
  const showsTarget = highlights.includes(best.to);
  const isCapture = game.get(best.to) !== undefined;

  if (hintLevel === 1) {
    if (showsPiece) leaking.push(best.from);
    if (showsTarget) leaking.push(best.to);
    return leaking;
  }
  if (showsTarget && (!isCapture || showsPiece)) leaking.push(best.to);
  return leaking;
}

export function guardReply(raw: string, context: GuardContext): GuardResult {
  const issues: GuardIssue[] = [];
  const fallback = (issue: GuardIssue): GuardResult => ({
    message: FALLBACK_MESSAGE[context.hintLevel],
    highlights: [],
    arrows: [],
    hintLevel: context.hintLevel,
    issues: [...issues, issue],
  });

  let data: unknown;
  try {
    data = extractJson(raw);
  } catch {
    return fallback("invalid-json");
  }
  const parsed = modelReplySchema.safeParse(data);
  if (!parsed.success) return fallback("invalid-shape");
  const reply = parsed.data;

  const game = new Chess(context.fen);
  const best = context.bestMove ?? undefined;

  if (best && messageLeaksMove(reply.message, context.fen, best)) {
    return fallback("leak-message");
  }

  const highlights: Square[] = [];
  for (const square of reply.highlights) {
    if (isSquare(square) && !highlights.includes(square))
      highlights.push(square);
    else issues.push("dropped-highlight");
  }
  if (best) {
    for (const square of leakingHighlights(
      highlights,
      game,
      best,
      context.hintLevel,
    )) {
      highlights.splice(highlights.indexOf(square), 1);
      issues.push("leak-highlight");
    }
  }

  const arrows: CoachArrow[] = [];
  for (const arrow of reply.arrows) {
    if (
      !isSquare(arrow.from) ||
      !isSquare(arrow.to) ||
      !arrowMakesSense(game, arrow.from, arrow.to)
    ) {
      issues.push("dropped-arrow");
      continue;
    }
    // Une flèche partant de la pièce du meilleur coup montre sa direction : on la retire.
    if (best && arrow.from === best.from) {
      issues.push("leak-arrow");
      continue;
    }
    arrows.push({ from: arrow.from, to: arrow.to });
  }

  return {
    message: reply.message,
    highlights: highlights.slice(0, MAX_HIGHLIGHTS),
    arrows: arrows.slice(0, MAX_ARROWS),
    hintLevel: context.hintLevel,
    issues,
  };
}
