import { Chess, type Square } from "chess.js";
import type { Color } from "@/lib/chess/game";
import {
  describeEvaluation,
  detectThemes,
  hangingPieces,
  opponentOf,
  type HangingPiece,
  type MoveFact,
  type Theme,
} from "@/lib/coach/facts";
import {
  agree,
  colorName,
  frenchSan,
  objectPronoun,
  PIECE_VALUE,
  pieceRef,
  withIndefinite,
} from "@/lib/coach/french";
import {
  fenAfterMove,
  type CoachArrow,
  type ExplainRequest,
} from "@/lib/coach/schema";
import { MOVE_CLASS_INFO } from "@/lib/engine/evaluation";

/**
 * Explication d'un coup signalé (imprécision, erreur, gaffe), en deux temps :
 * 1. « Pourquoi ? » : ce qui clochait, sans jamais donner le meilleur coup ;
 * 2. « Voir la solution » : le meilleur coup de Stockfish, et pourquoi il est meilleur.
 *
 * Comme pour les indices, le code calcule les faits à partir des deux analyses (avant et
 * après le coup) et écrit l'explication quand il reconnaît le cas ; sinon, le modèle de
 * langage formule à partir des mêmes faits.
 */

export type MistakeFacts = {
  /** Camp qui a joué le coup expliqué (le joueur que le coach aide). */
  mover: Color;
  fenBefore: string;
  fenAfter: string;
  moveClass: ExplainRequest["moveClass"];
  played: MoveFact;
  /** Meilleur coup de la position d'avant (la solution) et ses thèmes. */
  best: MoveFact;
  bestThemes: Theme[];
  /** Meilleure réplique adverse après le coup joué, et ses thèmes (du point de vue adverse). */
  refutation?: MoveFact;
  refutationThemes: Theme[];
  /** Pièces du joueur en prise après son coup. */
  hungAfter: HangingPiece[];
  evalBefore: string;
  evalAfter?: string;
};

export function extractMistakeFacts(request: ExplainRequest): MistakeFacts {
  const before = new Chess(request.fenBefore);
  const mover = before.turn();
  const enemy = opponentOf(mover);
  const fenAfter = fenAfterMove(request.fenBefore, request.played);
  if (!fenAfter) throw new Error("Coup joué illégal");
  const after = new Chess(fenAfter);

  // Le schéma a déjà vérifié que ces coups sont légaux : detectThemes réussit.
  const played = detectThemes(
    request.fenBefore,
    request.played,
    hangingPieces(before, enemy),
  )!;
  const best = detectThemes(
    request.fenBefore,
    request.before.bestMove,
    hangingPieces(before, enemy),
  )!;
  const hungAfter = hangingPieces(after, mover);
  const reply = request.after?.bestMove;
  const refutation = reply
    ? detectThemes(fenAfter, reply, hungAfter)
    : undefined;

  return {
    mover,
    fenBefore: request.fenBefore,
    fenAfter,
    moveClass: request.moveClass,
    played: played.fact,
    best: best.fact,
    bestThemes: best.themes,
    ...(refutation ? { refutation: refutation.fact } : {}),
    refutationThemes: refutation?.themes ?? [],
    hungAfter,
    evalBefore: describeEvaluation(request.before),
    ...(request.after ? { evalAfter: describeEvaluation(request.after) } : {}),
  };
}

export type ExplainTemplate = {
  message: string;
  highlights: Square[];
  arrows: CoachArrow[];
};

const kingSquare = (fen: string, color: Color): Square | undefined =>
  new Chess(fen)
    .board()
    .flat()
    .find((cell) => cell?.type === "k" && cell.color === color)?.square;

const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

/**
 * Étape 1 — « Pourquoi ? ». Explication écrite par le code, ou null si le cas n'est pas
 * reconnu. Jamais le meilleur coup : les cas « manqués » restent vagues. La réplique adverse,
 * elle, peut être montrée (c'est la menace, pas la solution) : les visuels portent sur la
 * position d'après le coup.
 */
export function explainWhy(facts: MistakeFacts): ExplainTemplate | null {
  const me = facts.mover;
  const enemy = opponentOf(me);
  const { refutation, refutationThemes, bestThemes } = facts;
  const replyArrow: CoachArrow[] = refutation
    ? [{ from: refutation.from, to: refutation.to }]
    : [];

  if (refutation && refutationThemes.includes("mate-in-1")) {
    const king = kingSquare(facts.fenAfter, me);
    return {
      message: `Après ce coup, ${pieceRef(refutation.piece, enemy, refutation.from, me)} peut donner échec et mat. Quelles cases autour de ton roi étaient mal protégées ?`,
      highlights: king ? [king] : [],
      arrows: replyArrow,
    };
  }

  if (bestThemes.includes("mate-in-1")) {
    return {
      message:
        "Tu avais un échec et mat en un coup ! Regarde le roi adverse : quelle pièce pouvait lui couper toutes ses cases de fuite ?",
      highlights: [],
      arrows: [],
    };
  }

  if (
    refutation?.captured &&
    refutationThemes.includes("free-capture") &&
    refutation.captured !== "p"
  ) {
    const victim = refutation.captured;
    const ref = pieceRef(victim, me, refutation.to, me);
    return {
      message: `Après ce coup, ${ref} n'est plus assez ${agree(victim, "défendu")} : ${pieceRef(refutation.piece, enemy, refutation.from, me)} peut ${objectPronoun(victim)} prendre. Comment aurais-tu pu ${objectPronoun(victim)} protéger ?`,
      highlights: [refutation.to],
      arrows: replyArrow,
    };
  }

  if (refutation && refutationThemes.includes("fork")) {
    return {
      message: `Après ce coup, ${pieceRef(refutation.piece, enemy, refutation.from, me)} peut attaquer deux de tes pièces à la fois : c'est une fourchette. Lesquelles sont visées ?`,
      highlights: [],
      arrows: replyArrow,
    };
  }

  if (bestThemes.includes("free-capture")) {
    return {
      message:
        "Tu pouvais gagner du matériel : une pièce adverse était mal défendue. Laquelle, et avec quoi la prendre ?",
      highlights: [],
      arrows: [],
    };
  }

  if (bestThemes.includes("fork")) {
    return {
      message:
        "Tu avais une fourchette : une de tes pièces pouvait attaquer deux cibles à la fois. Laquelle ?",
      highlights: [],
      arrows: [],
    };
  }

  const hung = [...facts.hungAfter].sort(
    (a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type],
  )[0];
  if (hung && hung.type !== "p") {
    return {
      message: `Après ce coup, ${pieceRef(hung.type, me, hung.square, me)} est en prise. L'avais-tu ${agree(hung.type, "vu")} ?`,
      highlights: [hung.square],
      arrows: [],
    };
  }

  return null;
}

/**
 * Étape 2 — « Voir la solution ». Le coup vient toujours de Stockfish ; le code écrit le
 * commentaire quand il reconnaît le thème, sinon null (le modèle commente).
 */
export function explainSolution(facts: MistakeFacts): ExplainTemplate | null {
  const me = facts.mover;
  const { best, bestThemes } = facts;
  const san = frenchSan(best.san);
  const arrows: CoachArrow[] = [{ from: best.from, to: best.to }];

  let why: string | null = null;
  if (bestThemes.includes("mate-in-1")) why = "échec et mat !";
  else if (bestThemes.includes("free-capture") && best.captured) {
    why = `il gagne ${withIndefinite(best.captured)} sans contrepartie.`;
  } else if (bestThemes.includes("fork")) {
    why = `${pieceRef(best.piece, me, best.to, me)} attaque deux pièces à la fois.`;
  } else if (best.isCheck) {
    why = "échec, qui force la réponse adverse et te donne l'initiative.";
  }
  if (!why) return null;

  return {
    message: `Le meilleur coup était ${san} : ${why} Vois-tu la différence avec ton coup ?`,
    highlights: [],
    arrows,
  };
}

/** Repli quand le modèle ne répond pas correctement. */
export const EXPLAIN_FALLBACK = {
  why: "Compare la position avant et après ton coup : qu'est-ce que l'adversaire peut faire maintenant qu'il ne pouvait pas avant ?",
  solution: (facts: MistakeFacts) =>
    `Le meilleur coup selon Stockfish était ${frenchSan(facts.best.san)}. Compare avec ton coup : qu'est-ce qu'il change ?`,
};

function moveLine(fact: MoveFact, color: Color, me: Color): string {
  const ref = pieceRef(fact.piece, color, fact.from, me);
  const action = fact.captured
    ? `prend ${withIndefinite(fact.captured)} en ${fact.to}`
    : `va en ${fact.to}`;
  const check = fact.isMate ? ", échec et mat" : fact.isCheck ? ", échec" : "";
  return `${capitalize(ref)} ${action}${check} (${frenchSan(fact.san)})`;
}

const THEME_LABEL: Record<Theme, string> = {
  "mate-in-1": "mat en un coup",
  "free-capture": "prise d'une pièce mal défendue",
  fork: "fourchette",
};

/**
 * Faits mis en lignes pour le modèle. À l'étape « why », le meilleur coup n'y figure pas
 * (seulement ses thèmes) : le modèle ne peut pas révéler ce qu'il ne connaît pas.
 */
export function mistakeFactsToPrompt(
  facts: MistakeFacts,
  step: ExplainRequest["step"],
): string {
  const me = facts.mover;
  const enemy = opponentOf(me);
  const lines = [
    `Joueur que tu aides : les ${colorName(me)}.`,
    `Coup joué : ${moveLine(facts.played, me, me)} — classé « ${MOVE_CLASS_INFO[facts.moveClass].label} ».`,
    `Évaluation avant le coup : ${facts.evalBefore}.`,
  ];
  if (facts.evalAfter) {
    lines.push(`Évaluation après le coup : ${facts.evalAfter}.`);
  }
  lines.push(
    "",
    "CE QUE LE COUP A PERMIS À L'ADVERSAIRE (à expliquer librement) :",
    facts.refutation
      ? `- Meilleure réplique adverse : ${moveLine(facts.refutation, enemy, me)}${
          facts.refutationThemes.length > 0
            ? ` — ${facts.refutationThemes.map((theme) => THEME_LABEL[theme]).join(", ")}`
            : ""
        }.`
      : "- Meilleure réplique adverse : inconnue.",
    `- Pièces du joueur en prise après son coup : ${
      facts.hungAfter.length === 0
        ? "aucune"
        : facts.hungAfter
            .map((piece) => pieceRef(piece.type, me, piece.square, me))
            .join(" ; ")
    }.`,
    "",
  );
  if (step === "why") {
    lines.push(
      "CE QUE LE JOUEUR A MANQUÉ (idée seulement, NE JAMAIS donner le coup) :",
      `- Thèmes du meilleur coup : ${
        facts.bestThemes.length === 0
          ? "aucun thème simple (amélioration de position)"
          : facts.bestThemes.map((theme) => THEME_LABEL[theme]).join(", ")
      }.`,
    );
  } else {
    lines.push(
      "SOLUTION (calculée par Stockfish, à expliquer au joueur) :",
      `- Meilleur coup : ${moveLine(facts.best, me, me)}${
        facts.bestThemes.length > 0
          ? ` — ${facts.bestThemes.map((theme) => THEME_LABEL[theme]).join(", ")}`
          : ""
      }.`,
    );
  }
  return lines.join("\n");
}
