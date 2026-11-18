import { describe, expect, it } from "vitest";
import {
  goCommand,
  parseBestMove,
  parseInfo,
  positionCommand,
  setOptionCommand,
  uciToMove,
} from "./uci";

describe("commandes UCI", () => {
  it("construit setoption, position et go", () => {
    expect(setOptionCommand("Skill Level", 3)).toBe(
      "setoption name Skill Level value 3",
    );
    expect(setOptionCommand("UCI_LimitStrength", true)).toBe(
      "setoption name UCI_LimitStrength value true",
    );
    expect(positionCommand("8/8/8/8/8/8/8/K6k w - - 0 1")).toBe(
      "position fen 8/8/8/8/8/8/8/K6k w - - 0 1",
    );
    expect(goCommand({ depth: 4, movetime: 200 })).toBe(
      "go depth 4 movetime 200",
    );
    expect(goCommand({ movetime: 500 })).toBe("go movetime 500");
  });

  it("refuse un go sans limite (le moteur chercherait sans fin)", () => {
    expect(() => goCommand({})).toThrow();
  });
});

describe("uciToMove", () => {
  it("convertit un coup simple et une promotion", () => {
    expect(uciToMove("e2e4")).toEqual({ from: "e2", to: "e4" });
    expect(uciToMove("e7e8q")).toEqual({
      from: "e7",
      to: "e8",
      promotion: "q",
    });
  });

  it("rejette un coup mal formé", () => {
    expect(uciToMove("e9e4")).toBeNull();
    expect(uciToMove("e2e4k")).toBeNull();
    expect(uciToMove("")).toBeNull();
  });
});

describe("parseBestMove", () => {
  it("lit le meilleur coup, avec ou sans ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toEqual({
      from: "e2",
      to: "e4",
    });
    expect(parseBestMove("bestmove a7a8n")).toEqual({
      from: "a7",
      to: "a8",
      promotion: "n",
    });
  });

  it("distingue « aucun coup » d'une ligne qui n'est pas bestmove", () => {
    expect(parseBestMove("bestmove (none)")).toBeNull();
    expect(parseBestMove("info depth 3 score cp 20")).toBeUndefined();
    expect(parseBestMove("readyok")).toBeUndefined();
  });
});

describe("parseInfo", () => {
  it("lit la profondeur, le score en centipions et la ligne principale", () => {
    expect(
      parseInfo(
        "info depth 12 seldepth 18 multipv 1 score cp 34 nodes 9000 pv e2e4 e7e5 g1f3",
      ),
    ).toEqual({
      depth: 12,
      score: { type: "cp", value: 34 },
      pv: ["e2e4", "e7e5", "g1f3"],
    });
  });

  it("lit un score de mat (négatif = le camp au trait se fait mater)", () => {
    expect(parseInfo("info depth 5 score mate -2 pv h7h6")).toEqual({
      depth: 5,
      score: { type: "mate", value: -2 },
      pv: ["h7h6"],
    });
  });

  it("ignore les lignes sans profondeur", () => {
    expect(parseInfo("info string NNUE evaluation using nn.nnue")).toBeNull();
    expect(parseInfo("uciok")).toBeNull();
  });
});
