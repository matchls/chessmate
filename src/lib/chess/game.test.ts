import { describe, expect, it } from "vitest";
import {
  checkedKingSquare,
  getStatus,
  isOwnPiece,
  legalTargets,
  needsPromotion,
  replay,
  statusLabel,
  toMovePairs,
  tryMove,
  type MoveInput,
} from "./game";

const m = (
  from: string,
  to: string,
  promotion?: MoveInput["promotion"],
): MoveInput => ({ from, to, promotion }) as MoveInput;

describe("tryMove", () => {
  it("accepte un coup légal et renvoie la nouvelle liste de coups", () => {
    const result = tryMove([], m("e2", "e4"));
    expect(result).toEqual({ ok: true, moves: [m("e2", "e4")], san: "e4" });
  });

  it("refuse un coup illégal sans modifier la liste", () => {
    const moves = [m("e2", "e4")];
    expect(tryMove(moves, m("e4", "e6"))).toEqual({ ok: false });
    expect(moves).toHaveLength(1);
  });

  it("refuse de jouer une pièce du camp qui n'a pas le trait", () => {
    expect(tryMove([], m("e7", "e5")).ok).toBe(false);
  });

  it("accepte le petit roque", () => {
    const moves = [
      m("e2", "e4"),
      m("e7", "e5"),
      m("g1", "f3"),
      m("b8", "c6"),
      m("f1", "c4"),
    ];
    const result = tryMove([...moves, m("g8", "f6")], m("e1", "g1"));
    expect(result.ok && result.san).toBe("O-O");
  });

  it("accepte la prise en passant", () => {
    const moves = [m("e2", "e4"), m("a7", "a6"), m("e4", "e5"), m("d7", "d5")];
    const result = tryMove(moves, m("e5", "d6"));
    expect(result.ok && result.san).toBe("exd6");
    if (result.ok) expect(replay(result.moves).get("d5")).toBeUndefined();
  });

  it("promeut le pion dans la pièce choisie", () => {
    const fen = "8/P7/8/8/8/8/8/k6K w - - 0 1";
    const result = tryMove([], m("a7", "a8", "n"), fen);
    expect(result.ok && result.san).toBe("a8=N");
  });
});

describe("needsPromotion", () => {
  it("détecte qu'un pion arrivant sur la dernière rangée doit être promu", () => {
    const game = replay([], "8/P7/8/8/8/8/8/k6K w - - 0 1");
    expect(needsPromotion(game, "a7", "a8")).toBe(true);
    expect(needsPromotion(game, "h1", "h2")).toBe(false);
  });
});

describe("legalTargets et isOwnPiece", () => {
  it("liste les cases d'arrivée d'une pièce", () => {
    const game = replay([]);
    expect(legalTargets(game, "g1").sort()).toEqual(["f3", "h3"]);
    expect(legalTargets(game, "e7")).toEqual([]);
  });

  it("indique si la pièce appartient au camp au trait", () => {
    const game = replay([m("e2", "e4")]);
    expect(isOwnPiece(game, "e7")).toBe(true);
    expect(isOwnPiece(game, "e4")).toBe(false);
    expect(isOwnPiece(game, "e5")).toBe(false);
  });
});

describe("getStatus", () => {
  it("partie en cours, aux blancs de jouer", () => {
    expect(getStatus(replay([]))).toEqual({
      kind: "playing",
      turn: "w",
      check: false,
    });
  });

  it("détecte l'échec et le roi menacé", () => {
    const game = replay([m("e2", "e4"), m("f7", "f6"), m("d1", "h5")]);
    expect(getStatus(game)).toEqual({
      kind: "playing",
      turn: "b",
      check: true,
    });
    expect(checkedKingSquare(game)).toBe("e8");
  });

  it("détecte le mat du berger", () => {
    const moves = [
      m("e2", "e4"),
      m("e7", "e5"),
      m("f1", "c4"),
      m("b8", "c6"),
      m("d1", "h5"),
      m("g8", "f6"),
      m("h5", "f7"),
    ];
    expect(getStatus(replay(moves))).toEqual({
      kind: "checkmate",
      winner: "w",
    });
  });

  it("détecte le pat", () => {
    const game = replay([], "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(getStatus(game)).toEqual({ kind: "draw", reason: "stalemate" });
  });

  it("détecte le matériel insuffisant", () => {
    const game = replay([], "8/8/8/4k3/8/8/8/4K2N w - - 0 1");
    expect(getStatus(game)).toEqual({
      kind: "draw",
      reason: "insufficient-material",
    });
  });

  it("détecte la triple répétition", () => {
    const shuffle = [
      m("g1", "f3"),
      m("g8", "f6"),
      m("f3", "g1"),
      m("f6", "g8"),
    ];
    const game = replay([...shuffle, ...shuffle]);
    expect(getStatus(game)).toEqual({ kind: "draw", reason: "threefold" });
  });

  it("détecte la règle des 50 coups", () => {
    const game = replay([m("a1", "a2")], "4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
    expect(getStatus(game)).toEqual({ kind: "draw", reason: "fifty-moves" });
  });
});

describe("statusLabel", () => {
  it("formule chaque état en français", () => {
    expect(statusLabel({ kind: "playing", turn: "w", check: false })).toBe(
      "Aux blancs de jouer",
    );
    expect(statusLabel({ kind: "playing", turn: "b", check: true })).toBe(
      "Échec ! Aux noirs de jouer",
    );
    expect(statusLabel({ kind: "checkmate", winner: "w" })).toBe(
      "Échec et mat : les blancs gagnent",
    );
    expect(statusLabel({ kind: "draw", reason: "stalemate" })).toBe(
      "Pat : partie nulle",
    );
  });
});

describe("toMovePairs", () => {
  it("regroupe les coups par paires numérotées", () => {
    expect(toMovePairs(["e4", "e5", "Nf3"])).toEqual([
      { number: 1, white: "e4", black: "e5" },
      { number: 2, white: "Nf3", black: undefined },
    ]);
  });
});
