import type { PieceSymbol, Square } from "chess.js";
import type { Color } from "@/lib/chess/game";

/** Noms des pièces en français, avec leur genre pour accorder « ton / ta », « le / la ». */
const PIECES: Record<PieceSymbol, { name: string; feminine: boolean }> = {
  p: { name: "pion", feminine: false },
  n: { name: "cavalier", feminine: false },
  b: { name: "fou", feminine: false },
  r: { name: "tour", feminine: true },
  q: { name: "dame", feminine: true },
  k: { name: "roi", feminine: false },
};

/** Valeur usuelle des pièces, en pions (le roi ne s'échange pas : 0). */
export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export function pieceName(type: PieceSymbol): string {
  return PIECES[type].name;
}

export function colorName(color: Color): string {
  return color === "w" ? "blancs" : "noirs";
}

/**
 * Désigne une pièce du point de vue de `perspective` (le camp que le coach aide) :
 * « ton cavalier en f3 », « ta dame en d1 », « le fou adverse en c4 », « la tour adverse en a8 ».
 */
export function pieceRef(
  type: PieceSymbol,
  color: Color,
  square: Square,
  perspective: Color,
): string {
  const { name, feminine } = PIECES[type];
  if (color === perspective)
    return `${feminine ? "ta" : "ton"} ${name} en ${square}`;
  return `${feminine ? "la" : "le"} ${name} adverse en ${square}`;
}

/** « un cavalier », « une dame ». */
export function withIndefinite(type: PieceSymbol): string {
  const { name, feminine } = PIECES[type];
  return `${feminine ? "une" : "un"} ${name}`;
}

/** Accorde un participe au genre de la pièce : « attaqué » → « attaquée » pour une dame. */
export function agree(type: PieceSymbol, participle: string): string {
  return PIECES[type].feminine ? `${participle}e` : participle;
}
