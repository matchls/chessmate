import { Chess, type Square } from "chess.js";
import type { Color } from "@/lib/chess/game";
import type { HangingPiece, PositionFacts } from "@/lib/coach/facts";
import { PIECE_VALUE, pieceRef, pronoun } from "@/lib/coach/french";
import type { CoachArrow, HintLevel } from "@/lib/coach/schema";

/**
 * Indices des niveaux 1 et 2, écrits par le code à partir des faits (des « gabarits »).
 * Toujours justes, instantanés, gratuits, et incapables de révéler le coup : ils ne
 * connaissent que la zone (niveau 1) ou la pièce (niveau 2), jamais la destination.
 * Le niveau 3 et les questions du joueur sont confiés au modèle de langage.
 */

export type TemplateHint = {
  message: string;
  highlights: Square[];
  arrows: CoachArrow[];
};

type Pick = <T>(options: readonly T[]) => T;

const randomPick: Pick = (options) =>
  options[Math.floor(Math.random() * options.length)];

const opponentOf = (color: Color): Color => (color === "w" ? "b" : "w");

function kingSquare(game: Chess, color: Color): Square | undefined {
  for (const cell of game.board().flat()) {
    if (cell?.type === "k" && cell.color === color) return cell.square;
  }
  return undefined;
}

/** Cases voisines d'une case (pour surligner une zone sans montrer une case précise). */
function neighbours(square: Square): Square[] {
  const file = square.charCodeAt(0);
  const rank = Number(square[1]);
  const result: Square[] = [];
  for (const df of [-1, 0, 1]) {
    for (const dr of [-1, 0, 1]) {
      if (df === 0 && dr === 0) continue;
      const f = file + df;
      const r = rank + dr;
      if (f >= 97 && f <= 104 && r >= 1 && r <= 8) {
        result.push(`${String.fromCharCode(f)}${r}` as Square);
      }
    }
  }
  return result;
}

/** « de le fou » → « du fou », « de les » → « des ». */
function of(text: string): string {
  if (text.startsWith("le ")) return `du ${text.slice(3)}`;
  if (text.startsWith("les ")) return `des ${text.slice(4)}`;
  return `de ${text}`;
}

/** Zone de l'échiquier, en mots, d'après une case : aile dame, centre, aile roi. */
function zoneOf(square: Square): string {
  const file = square[0];
  if ("abc".includes(file)) return "l'aile dame (colonnes a à c)";
  if ("fgh".includes(file)) return "l'aile roi (colonnes f à h)";
  return "le centre (colonnes d et e)";
}

function mostValuable(
  pieces: readonly HangingPiece[],
): HangingPiece | undefined {
  return [...pieces].sort(
    (a, b) => PIECE_VALUE[b.type] - PIECE_VALUE[a.type],
  )[0];
}

const GENERIC: Record<1 | 2, readonly string[]> = {
  1: [
    "Fais le tour de l'échiquier : quelles pièces adverses sont mal protégées, et lesquelles des tiennes le sont ?",
    "Avant de jouer, regarde les menaces : qu'est-ce que ton adversaire veut faire au prochain coup ?",
  ],
  2: [
    "Regarde chacune de tes pièces : laquelle est la moins active, et où serait-elle plus utile ?",
    "Quelle pièce adverse a le moins de défenseurs ? Laquelle de tes pièces pourrait la viser ?",
  ],
};

/**
 * Niveau 1 — « où regarder ». Ordre de priorité :
 * 1. ton roi est en échec ;
 * 2. tu as un mat en un coup : on montre le roi adverse ;
 * 3. une de tes pièces est en prise ;
 * 4. une pièce adverse est à prendre gratuitement ;
 * 5. sinon, la zone du meilleur coup (cases voisines de la destination, jamais la destination).
 * Les simples menaces d'échec adverses ne sont pas signalées ici : trop fréquentes, souvent
 * sans danger réel (le modèle les reçoit dans les faits pour le niveau 3).
 */
function levelOne(facts: PositionFacts, game: Chess, pick: Pick): TemplateHint {
  const me = facts.turn;
  const enemy = opponentOf(me);
  const best = facts.secret.bestMove;

  if (facts.inCheck) {
    const king = kingSquare(game, me);
    return {
      message: pick([
        "Ton roi est en échec. As-tu pensé aux trois façons d'y répondre : le déplacer, t'interposer ou prendre la pièce qui attaque ?",
        "Échec ! Avant tout, quelles sont toutes les façons de mettre ton roi à l'abri ?",
      ]),
      highlights: king ? [king] : [],
      arrows: [],
    };
  }

  if (best && facts.secret.themes.includes("mate-in-1")) {
    const enemyKing = kingSquare(game, enemy);
    return {
      message: pick([
        "Le roi adverse est peut-être plus vulnérable qu'il n'y paraît. Toutes les cases autour de lui sont-elles bien protégées ?",
        "Regarde le roi adverse : a-t-il vraiment des cases de fuite ?",
      ]),
      highlights: enemyKing ? [enemyKing] : [],
      arrows: [],
    };
  }

  const endangered = mostValuable(facts.dangers.hanging);
  if (endangered) {
    const ref = pieceRef(
      endangered.type,
      endangered.color,
      endangered.square,
      me,
    );
    const attacker = [...endangered.attackers].sort(
      (a, b) => PIECE_VALUE[game.get(a)!.type] - PIECE_VALUE[game.get(b)!.type],
    )[0];
    const it = pronoun(endangered.type);
    const obj = it === "elle" ? "la" : "le";
    const agreed = it === "elle" ? "e" : "";
    return {
      message: pick([
        `Attention : ${ref} est en danger. Comment peux-tu ${obj} mettre à l'abri ou ${obj} protéger ?`,
        `Regarde bien ${ref} : est-${it} suffisamment défendu${agreed} ?`,
      ]),
      highlights: [endangered.square],
      arrows: attacker ? [{ from: attacker, to: endangered.square }] : [],
    };
  }

  if (best && facts.secret.themes.includes("free-capture")) {
    return {
      message: pick([
        "Une pièce adverse est peut-être mal protégée. Laquelle, et qui la défend ?",
        "Compte les défenseurs des pièces adverses : l'une d'elles est-elle à prendre ?",
      ]),
      highlights: [],
      arrows: [],
    };
  }

  if (best) {
    const zone = neighbours(best.to)
      .filter((square) => square !== best.from && !game.get(square))
      .slice(0, 2);
    return {
      message: pick([
        `Regarde du côté ${of(zoneOf(best.to))}. Laquelle de tes pièces pourrait y jouer un rôle ?`,
        `Il se passe quelque chose vers ${zoneOf(best.to)}. Qu'est-ce qui pourrait y changer ?`,
      ]),
      highlights: zone,
      arrows: [],
    };
  }

  return { message: pick(GENERIC[1]), highlights: [], arrows: [] };
}

function levelTwo(facts: PositionFacts, pick: Pick): TemplateHint {
  const me = facts.turn;
  const best = facts.secret.bestMove;
  if (!best) return { message: pick(GENERIC[2]), highlights: [], arrows: [] };

  const ref = pieceRef(best.piece, me, best.from, me);
  const it = pronoun(best.piece);
  const capital = ref[0].toUpperCase() + ref.slice(1);
  return {
    message: pick([
      `${capital} a un rôle à jouer. Où serait-${it} le plus utile ?`,
      `Intéresse-toi à ${ref}. Que peut-${it} attaquer ou menacer ?`,
    ]),
    highlights: [best.from],
    arrows: [],
  };
}

/** Indice écrit par le code pour les niveaux 1 et 2. */
export function templateHint(
  fen: string,
  facts: PositionFacts,
  hintLevel: Extract<HintLevel, 1 | 2>,
  pick: Pick = randomPick,
): TemplateHint {
  const game = new Chess(fen);
  return hintLevel === 1 ? levelOne(facts, game, pick) : levelTwo(facts, pick);
}
