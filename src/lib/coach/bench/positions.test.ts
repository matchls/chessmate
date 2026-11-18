import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { coachRequestSchema } from "@/lib/coach/schema";
import { BENCH_POSITIONS } from "./positions";

describe("positions du banc d'essai", () => {
  it("contient 20 positions aux identifiants uniques", () => {
    expect(BENCH_POSITIONS).toHaveLength(20);
    expect(new Set(BENCH_POSITIONS.map((p) => p.id)).size).toBe(20);
  });

  it.each(BENCH_POSITIONS)(
    "$id : demande valide et meilleur coup légal",
    (position) => {
      for (const benchCase of position.cases) {
        expect(
          coachRequestSchema.safeParse({
            fen: position.fen,
            analysis: position.analysis,
            ...benchCase,
          }).success,
        ).toBe(true);
      }
      const best = position.analysis.bestMove!;
      expect(() => new Chess(position.fen).move(best)).not.toThrow();
    },
  );
});
