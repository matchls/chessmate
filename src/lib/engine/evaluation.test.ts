import { describe, expect, it } from "vitest";
import { parseInfo, type EngineInfo } from "./uci";
import {
  buildAnalysis,
  classifyMove,
  scoreToCp,
  terminalScore,
  toWhitePov,
  winningChances,
} from "./evaluation";

const cp = (value: number) => ({ type: "cp", value }) as const;
const mate = (value: number) => ({ type: "mate", value }) as const;

describe("toWhitePov", () => {
  it("garde le score si les blancs ont le trait, l'inverse sinon", () => {
    expect(toWhitePov(cp(50), "w")).toEqual(cp(50));
    expect(toWhitePov(cp(50), "b")).toEqual(cp(-50));
    expect(toWhitePov(mate(3), "b")).toEqual(mate(-3));
  });
});

describe("scoreToCp", () => {
  it("borne les centipions à ±1000", () => {
    expect(scoreToCp(cp(120))).toBe(120);
    expect(scoreToCp(cp(5000))).toBe(1000);
    expect(scoreToCp(cp(-5000))).toBe(-1000);
  });

  it("traite un mat comme un avantage maximal, de son signe", () => {
    expect(scoreToCp(mate(2))).toBe(1000);
    expect(scoreToCp(mate(-4))).toBe(-1000);
    expect(scoreToCp(mate(0))).toBe(-1000);
  });
});

describe("winningChances", () => {
  it("vaut 0 à l'équilibre et tend vers ±1", () => {
    expect(winningChances(cp(0))).toBeCloseTo(0);
    expect(winningChances(cp(300))).toBeGreaterThan(0.4);
    expect(winningChances(cp(1000))).toBeGreaterThan(0.9);
    expect(winningChances(cp(-1000))).toBeLessThan(-0.9);
  });
});

describe("classifyMove", () => {
  it("un coup qui garde l'évaluation est bon", () => {
    expect(classifyMove(cp(30), cp(20), "w")).toBe("good");
  });

  it("classe selon la perte de chances de gain, pour les blancs comme pour les noirs", () => {
    expect(classifyMove(cp(0), cp(-60), "w")).toBe("inaccuracy");
    expect(classifyMove(cp(0), cp(-120), "w")).toBe("mistake");
    expect(classifyMove(cp(0), cp(-300), "w")).toBe("blunder");
    // Pour les noirs, perdre signifie que le score côté blancs monte.
    expect(classifyMove(cp(0), cp(300), "b")).toBe("blunder");
    expect(classifyMove(cp(0), cp(-300), "b")).toBe("good");
  });

  it("ne crie pas à la gaffe quand on gagne encore largement", () => {
    expect(classifyMove(cp(1000), cp(700), "w")).toBe("good");
  });

  it("laisser filer un mat gagnant pour une position égale est une gaffe", () => {
    expect(classifyMove(mate(2), cp(0), "w")).toBe("blunder");
  });
});

describe("terminalScore", () => {
  it("donne un mat au gagnant et 0 pour une nulle", () => {
    expect(terminalScore({ kind: "checkmate", winner: "w" })).toEqual(mate(1));
    expect(terminalScore({ kind: "checkmate", winner: "b" })).toEqual(mate(-1));
    expect(terminalScore({ kind: "draw", reason: "stalemate" })).toEqual(cp(0));
    expect(
      terminalScore({ kind: "playing", turn: "w", check: false }),
    ).toBeNull();
  });
});

describe("buildAnalysis", () => {
  const infos = [
    "info depth 1 score cp 10 pv e7e5",
    "info depth 12 score cp -35 pv e7e5 g1f3",
    "info depth 12 currmove e7e5 currmovenumber 1",
  ]
    .map(parseInfo)
    .filter((info): info is EngineInfo => info !== null);

  it("garde la ligne la plus profonde avec un score, ramenée côté blancs", () => {
    expect(buildAnalysis(infos, "bestmove e7e5 ponder g1f3", "b")).toEqual({
      score: cp(35),
      bestMove: { from: "e7", to: "e5" },
      pv: ["e7e5", "g1f3"],
      depth: 12,
    });
  });

  it("renvoie null sans aucun score", () => {
    expect(buildAnalysis([], "bestmove (none)", "w")).toBeNull();
  });
});
