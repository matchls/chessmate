import { describe, expect, it } from "vitest";
import type { PositionAnalysis } from "@/lib/engine/evaluation";
import { extractFacts } from "./facts";
import { templateHint } from "./hints";

const first = <T>(options: readonly T[]) => options[0];
const withBest = (
  bestMove: PositionAnalysis["bestMove"],
): PositionAnalysis => ({
  score: { type: "cp", value: 0 },
  bestMove,
  pv: [],
  depth: 14,
});

function hint(
  fen: string,
  level: 1 | 2,
  bestMove?: PositionAnalysis["bestMove"],
) {
  const facts = extractFacts({
    fen,
    analysis: bestMove ? withBest(bestMove) : undefined,
  });
  return templateHint(fen, facts, level, first);
}

describe("templateHint niveau 1", () => {
  it("roi en échec : on le signale et on surligne le roi", () => {
    const fen =
      "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3";
    const result = hint(fen, 1, { from: "g2", to: "g3" });
    expect(result.message).toMatch(/échec/);
    expect(result.highlights).toEqual(["e1"]);
  });

  it("pièce du joueur en danger : on la surligne avec la flèche de la menace", () => {
    const fen = "4k3/8/8/8/4p3/5N2/8/4K3 w - - 0 1";
    const result = hint(fen, 1, { from: "f3", to: "d4" });
    expect(result.message).toContain("ton cavalier en f3");
    expect(result.message).toContain("le mettre à l'abri");
    expect(result.highlights).toEqual(["f3"]);
    expect(result.arrows).toEqual([{ from: "e4", to: "f3" }]);
  });

  it("accorde au féminin pour une dame", () => {
    const fen = "4k3/8/8/8/8/2p5/3Q4/4K3 w - - 0 1";
    const result = hint(fen, 1, { from: "d2", to: "c3" });
    expect(result.message).toContain("ta dame en d2");
    expect(result.message).toContain("la mettre à l'abri");
  });

  it("mat en 1 : on montre le roi adverse, jamais la pièce ni la case du mat", () => {
    const fen = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
    const result = hint(fen, 1, { from: "a1", to: "a8" });
    expect(result.highlights).toEqual(["g8"]);
    expect(result.message).not.toMatch(/\ba1\b|\ba8\b|\btour\b/);
  });

  it("prise possible : on invite à compter les défenseurs, sans rien surligner", () => {
    const fen = "4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1";
    const result = hint(fen, 1, { from: "e3", to: "d5" });
    expect(result.message).toMatch(/mal protégée/);
    expect(result.highlights).toEqual([]);
  });

  it("coup calme : on nomme la zone et on surligne des cases voisines, jamais la destination", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const result = hint(start, 1, { from: "e2", to: "e4" });
    expect(result.message).toContain("du côté du centre");
    expect(result.highlights).not.toContain("e4");
    expect(result.highlights).not.toContain("e2");
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it("coup calme en bordure de zone : les cases surlignées restent dans la zone annoncée", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const result = hint(start, 1, { from: "g1", to: "f3" });
    expect(result.message).toContain("aile roi");
    expect(result.highlights.length).toBeGreaterThan(0);
    for (const square of result.highlights) expect("fgh").toContain(square[0]);
  });

  it("sans analyse : indice général", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(hint(start, 1).message.length).toBeGreaterThan(20);
  });
});

describe("templateHint niveau 2", () => {
  it("désigne la pièce à jouer, jamais sa destination", () => {
    const fen = "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1";
    const result = hint(fen, 2, { from: "b5", to: "c7" });
    expect(result.message).toBe(
      "Ton cavalier en b5 a un rôle à jouer. Où serait-il le plus utile ?",
    );
    expect(result.highlights).toEqual(["b5"]);
    expect(result.message).not.toContain("c7");
  });

  it("accorde « elle » pour une tour", () => {
    const fen = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
    expect(hint(fen, 2, { from: "a1", to: "a8" }).message).toContain(
      "Où serait-elle",
    );
  });
});
