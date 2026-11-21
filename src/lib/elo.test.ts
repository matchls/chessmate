import { describe, expect, it } from "vitest";
import { eloAfterGame, expectedScore } from "./elo";

describe("Elo", () => {
  it("score attendu : à force égale 50 %, 600 contre 800 environ 24 %", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    expect(expectedScore(600, 800)).toBeCloseTo(0.24, 2);
  });

  it("victoire inattendue : beaucoup de points ; défaite attendue : peu", () => {
    const base = { rating: 600, opponent: 800, countedGames: 0 };
    expect(eloAfterGame({ ...base, score: 1 })).toEqual({
      before: 600,
      after: 630,
      delta: 30,
    });
    expect(eloAfterGame({ ...base, score: 0 }).delta).toBe(-10);
    expect(eloAfterGame({ ...base, score: 0.5 }).delta).toBe(10);
  });

  it("après les 20 premières parties, les variations sont deux fois plus petites", () => {
    expect(
      eloAfterGame({ rating: 600, opponent: 800, score: 1, countedGames: 20 })
        .delta,
    ).toBe(15);
  });

  it("battre un bot plus faible rapporte peu", () => {
    expect(
      eloAfterGame({ rating: 1200, opponent: 800, score: 1, countedGames: 0 })
        .delta,
    ).toBe(4);
  });

  it("jamais sous 100", () => {
    expect(
      eloAfterGame({ rating: 110, opponent: 100, score: 0, countedGames: 0 }),
    ).toEqual({ before: 110, after: 100, delta: -10 });
  });
});
