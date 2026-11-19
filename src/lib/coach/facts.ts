import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";
import type { Color, MoveInput } from "@/lib/chess/game";
import {
  agree,
  colorName,
  PIECE_VALUE,
  pieceRef,
  withIndefinite,
} from "@/lib/coach/french";
import {
  MOVE_CLASS_INFO,
  scoreToCp,
  type MoveClass,
  type PositionAnalysis,
} from "@/lib/engine/evaluation";

/**
 * Extracteur de faits : transforme une position (et son analyse Stockfish) en faits simples,
 * calculés par le code, pour que le modèle de langage du coach n'ait qu'à les formuler.
 *
 * Tout est exprimé du point de vue du camp au trait (« le joueur » que le coach aide).
 * Trois tiroirs :
 * - `dangers` : ce qui menace le joueur, à dire sans retenue ;
 * - `opportunities` : les pistes du joueur, à suggérer progressivement (indices) ;
 * - `secret` : le meilleur coup et son thème, réservés au coach, jamais affichés au joueur.
 */

export type PieceOnSquare = { type: PieceSymbol; color: Color; square: Square };

export type HangingPiece = PieceOnSquare & {
  attackers: Square[];
  defenders: Square[];
  /** Pièce adverse la moins chère parmi celles qui attaquent. */
  cheapestAttacker: PieceSymbol;
};

export type MoveFact = {
  san: string;
  piece: PieceSymbol;
  from: Square;
  to: Square;
  captured?: PieceSymbol;
  isCheck: boolean;
  isMate: boolean;
};

export type Theme = "mate-in-1" | "free-capture" | "fork";

export type PositionFacts = {
  turn: Color;
  inCheck: boolean;
  material: { w: number; b: number };
  lastMove?: { san: string; moveClass?: MoveClass };
  dangers: {
    /** Pièces du joueur en prise. */
    hanging: HangingPiece[];
    /** Pièces adverses qui pourraient faire échec si c'était à l'adversaire de jouer. */
    checkThreats: PieceOnSquare[];
  };
  opportunities: {
    /** Pièces adverses en prise. */
    hanging: HangingPiece[];
    /** Pièces du joueur qui peuvent faire échec maintenant. */
    checkingPieces: PieceOnSquare[];
  };
  secret: {
    bestMove?: MoveFact;
    themes: Theme[];
    evaluation?: string;
  };
};

export type ExtractInput = {
  fen: string;
  analysis?: PositionAnalysis;
  /** Dernier coup joué (celui qui a mené à cette position) et son classement. */
  lastMove?: { san: string; moveClass?: MoveClass };
};

export const opponentOf = (color: Color): Color => (color === "w" ? "b" : "w");

function piecesOf(game: Chess, color: Color): PieceOnSquare[] {
  return game
    .board()
    .flat()
    .filter((cell) => cell !== null && cell.color === color)
    .map((cell) => ({
      type: cell!.type,
      color: cell!.color,
      square: cell!.square,
    }));
}

function material(game: Chess): { w: number; b: number } {
  const total = { w: 0, b: 0 };
  for (const cell of game.board().flat()) {
    if (cell) total[cell.color] += PIECE_VALUE[cell.type];
  }
  return total;
}

/**
 * Pièces de `color` en prise : attaquées et soit sans défenseur, soit attaquées par une pièce
 * de moindre valeur (un pion qui attaque une dame, c'est grave même si elle est défendue).
 */
export function hangingPieces(game: Chess, color: Color): HangingPiece[] {
  const enemy = opponentOf(color);
  const result: HangingPiece[] = [];
  for (const piece of piecesOf(game, color)) {
    if (piece.type === "k") continue;
    const attackers = game.attackers(piece.square, enemy);
    if (attackers.length === 0) continue;
    const defenders = game.attackers(piece.square, color);
    const attackerTypes = attackers.map((square) => game.get(square)!.type);
    // Le roi ne peut pas prendre une pièce défendue : on l'écarte s'il y a d'autres attaquants,
    // et il ne compte jamais comme « attaquant moins cher ».
    const nonKing = attackerTypes.filter((type) => type !== "k");
    const cheapestAttacker = (
      nonKing.length > 0 ? nonKing : attackerTypes
    ).reduce((a, b) => (PIECE_VALUE[a] <= PIECE_VALUE[b] ? a : b));
    const outnumbered = defenders.length === 0;
    const cheaperAttacker =
      cheapestAttacker !== "k" &&
      PIECE_VALUE[cheapestAttacker] < PIECE_VALUE[piece.type];
    if (outnumbered || cheaperAttacker) {
      result.push({ ...piece, attackers, defenders, cheapestAttacker });
    }
  }
  return result;
}

/** Pièces distinctes de `color` qui peuvent donner échec (en supposant que `color` a le trait). */
function checkingPieces(fen: string, color: Color): PieceOnSquare[] {
  const game = new Chess(fen);
  if (game.turn() !== color) {
    if (game.inCheck()) return []; // on ne peut pas « passer » son tour en étant en échec
    game.setTurn(color);
  }
  const seen = new Map<Square, PieceOnSquare>();
  for (const move of game.moves({ verbose: true })) {
    if (move.san.includes("+") || move.san.includes("#")) {
      seen.set(move.from, { type: move.piece, color, square: move.from });
    }
  }
  return [...seen.values()];
}

function toMoveFact(move: Move, after: Chess): MoveFact {
  return {
    san: move.san,
    piece: move.piece,
    from: move.from,
    to: move.to,
    ...(move.captured ? { captured: move.captured } : {}),
    isCheck: after.inCheck(),
    isMate: after.isCheckmate(),
  };
}

export function detectThemes(
  fen: string,
  move: MoveInput,
  enemyHanging: readonly HangingPiece[],
): { fact: MoveFact; themes: Theme[] } | undefined {
  const game = new Chess(fen);
  let played: Move;
  try {
    played = game.move(move);
  } catch {
    return undefined;
  }
  const fact = toMoveFact(played, game);
  const themes: Theme[] = [];

  if (fact.isMate) themes.push("mate-in-1");
  if (fact.captured && enemyHanging.some((piece) => piece.square === fact.to)) {
    themes.push("free-capture");
  }

  // Fourchette : la pièce jouée attaque au moins deux cibles plus précieuses qu'elle (ou le roi).
  const mover = played.color;
  // Un coup de roi ne compte pas comme fourchette (le roi « vaut » 0) ; pour une promotion,
  // c'est la nouvelle pièce qui attaque.
  const movedValue =
    played.piece === "k"
      ? Infinity
      : PIECE_VALUE[played.promotion ?? played.piece];
  const targets = piecesOf(game, opponentOf(mover)).filter(
    (target) =>
      (target.type === "k" || PIECE_VALUE[target.type] > movedValue) &&
      game.attackers(target.square, mover).includes(played.to),
  );
  if (targets.length >= 2) themes.push("fork");

  return { fact, themes };
}

/** Résumé de l'évaluation en mots, du point de vue des blancs. */
export function describeEvaluation(analysis: PositionAnalysis): string {
  const { score } = analysis;
  if (score.type === "mate") {
    return `mat forcé pour les ${score.value > 0 ? "blancs" : "noirs"}`;
  }
  const cp = scoreToCp(score);
  const side = cp > 0 ? "blancs" : "noirs";
  const size = Math.abs(cp);
  if (size < 50) return "position équilibrée";
  if (size < 150) return `léger avantage pour les ${side}`;
  if (size < 400) return `net avantage pour les ${side}`;
  return `avantage décisif pour les ${side}`;
}

export function extractFacts({
  fen,
  analysis,
  lastMove,
}: ExtractInput): PositionFacts {
  const game = new Chess(fen);
  const turn = game.turn();
  const enemy = opponentOf(turn);

  const enemyHanging = hangingPieces(game, enemy);
  const best = analysis?.bestMove
    ? detectThemes(fen, analysis.bestMove, enemyHanging)
    : undefined;

  return {
    turn,
    inCheck: game.inCheck(),
    material: material(game),
    ...(lastMove ? { lastMove } : {}),
    dangers: {
      hanging: hangingPieces(game, turn),
      checkThreats: checkingPieces(fen, enemy),
    },
    opportunities: {
      hanging: enemyHanging,
      checkingPieces: checkingPieces(fen, turn),
    },
    secret: {
      ...(best ? { bestMove: best.fact } : {}),
      themes: best?.themes ?? [],
      ...(analysis ? { evaluation: describeEvaluation(analysis) } : {}),
    },
  };
}

const THEME_LABEL: Record<Theme, string> = {
  "mate-in-1": "mat en un coup",
  "free-capture": "prise d'une pièce mal défendue",
  fork: "fourchette (une pièce attaque deux cibles)",
};

function hangingLine(piece: HangingPiece, perspective: Color): string {
  const ref = pieceRef(piece.type, piece.color, piece.square, perspective);
  const attacked = agree(piece.type, "attaqué");
  const defended = agree(piece.type, "défendu");
  const by = withIndefinite(piece.cheapestAttacker);
  const defense =
    piece.defenders.length === 0
      ? `non ${defended}`
      : `${defended} ${piece.defenders.length} fois`;
  return `${ref} (${attacked} ${piece.attackers.length} fois, dont par ${by} ; ${defense})`;
}

function list(items: string[]): string {
  return items.length === 0 ? "aucune" : items.join(" ; ");
}

/**
 * Ce que le modèle a le droit de savoir du meilleur coup (« besoin d'en connaître ») :
 * - `none` : rien, seulement l'évaluation (niveau 1) ;
 * - `piece` : la pièce qui a le meilleur coup, sans sa destination (niveau 2) ;
 * - `idea` : la pièce, le thème et la cible d'une prise, sans la case d'arrivée (niveau 3) ;
 * - `full` : tout, coup compris (tests et outils internes uniquement).
 */
export type SecretLevel = "none" | "piece" | "idea" | "full";

/** Met les faits en quelques lignes compactes pour le prompt du coach. */
export function factsToPrompt(
  facts: PositionFacts,
  secretLevel: SecretLevel = "full",
): string {
  const me = facts.turn;
  const lines = [
    `Trait : ${colorName(me)} (le joueur que tu aides)${facts.inCheck ? ", en échec" : ""}.`,
    `Matériel : blancs ${facts.material.w}, noirs ${facts.material.b}.`,
  ];
  if (facts.lastMove) {
    const moveClass = facts.lastMove.moveClass;
    const label =
      moveClass && moveClass !== "good"
        ? ` (${MOVE_CLASS_INFO[moveClass].label})`
        : "";
    lines.push(`Dernier coup joué : ${facts.lastMove.san}${label}.`);
  }

  lines.push(
    "",
    "DANGERS (à signaler librement) :",
    `- Pièces du joueur en prise : ${list(facts.dangers.hanging.map((p) => hangingLine(p, me)))}.`,
    `- Pièces adverses qui menacent de faire échec : ${list(
      facts.dangers.checkThreats.map((p) =>
        pieceRef(p.type, p.color, p.square, me),
      ),
    )}.`,
    "",
    "PISTES (à suggérer progressivement, sans donner le coup) :",
    `- Pièces adverses en prise : ${list(facts.opportunities.hanging.map((p) => hangingLine(p, me)))}.`,
    `- Pièces du joueur qui peuvent faire échec : ${list(
      facts.opportunities.checkingPieces.map((p) =>
        pieceRef(p.type, p.color, p.square, me),
      ),
    )}.`,
  );

  const { bestMove, themes, evaluation } = facts.secret;
  const showPiece = secretLevel !== "none";
  const showIdea = secretLevel === "idea" || secretLevel === "full";
  if (bestMove || evaluation) {
    lines.push("", "SECRET (pour te guider, NE JAMAIS le révéler au joueur) :");
    if (evaluation) lines.push(`- Évaluation : ${evaluation}.`);
    if (bestMove && secretLevel === "full") {
      const ref = pieceRef(bestMove.piece, me, bestMove.from, me);
      const action = bestMove.captured
        ? `prend ${pieceRef(bestMove.captured, opponentOf(me), bestMove.to, me)}`
        : `va en ${bestMove.to}`;
      const check = bestMove.isMate
        ? ", échec et mat"
        : bestMove.isCheck
          ? ", avec échec"
          : "";
      lines.push(
        `- Meilleur coup : ${ref} ${action}${check} (${bestMove.san}).`,
      );
    } else if (bestMove && showPiece) {
      // On ne donne que ce que le coach a le droit de suggérer à ce niveau : jamais la case
      // d'arrivée (sauf la pièce à prendre, au niveau « idée »).
      lines.push(
        `- Pièce qui a le meilleur coup : ${pieceRef(bestMove.piece, me, bestMove.from, me)} (ne dis jamais où elle va).`,
      );
      if (showIdea && bestMove.captured) {
        lines.push(
          `- Cible : ${pieceRef(bestMove.captured, opponentOf(me), bestMove.to, me)}.`,
        );
      }
      if (showIdea && bestMove.isCheck)
        lines.push("- Le meilleur coup donne échec.");
    }
    if (showIdea && themes.length > 0) {
      lines.push(
        `- Thème : ${themes.map((theme) => THEME_LABEL[theme]).join(", ")}.`,
      );
    }
  }

  return lines.join("\n");
}
