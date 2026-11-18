import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import type { PositionAnalysis } from "@/lib/engine/evaluation";
import {
  describeEvaluation,
  extractFacts,
  factsToPrompt,
  hangingPieces,
} from "./facts";
import { pieceRef } from "./french";

const START = new Chess().fen();

const analysisWith = (
  bestMove: PositionAnalysis["bestMove"],
  score: PositionAnalysis["score"] = { type: "cp", value: 0 },
): PositionAnalysis => ({ score, bestMove, pv: [], depth: 14 });

describe("pieceRef", () => {
  it("parle au joueur et accorde le genre", () => {
    expect(pieceRef("n", "w", "f3", "w")).toBe("ton cavalier en f3");
    expect(pieceRef("q", "w", "d1", "w")).toBe("ta dame en d1");
    expect(pieceRef("b", "b", "c4", "w")).toBe("le fou adverse en c4");
    expect(pieceRef("r", "b", "a8", "w")).toBe("la tour adverse en a8");
  });
});

describe("hangingPieces", () => {
  it("repère une pièce attaquée et non défendue", () => {
    const game = new Chess("4k3/8/8/8/4p3/5N2/8/4K3 w - - 0 1");
    const hanging = hangingPieces(game, "w");
    expect(hanging).toHaveLength(1);
    expect(hanging[0]).toMatchObject({
      type: "n",
      square: "f3",
      attackers: ["e4"],
      defenders: [],
    });
  });

  it("repère une pièce défendue mais attaquée par une pièce de moindre valeur", () => {
    const game = new Chess("4k3/8/8/8/4p3/5N2/6P1/4K3 w - - 0 1");
    expect(hangingPieces(game, "w")).toMatchObject([
      { square: "f3", defenders: ["g2"], cheapestAttacker: "p" },
    ]);
  });

  it("une pièce défendue attaquée seulement par le roi n'est pas en prise", () => {
    const game = new Chess("8/8/8/4k3/3P4/2P5/8/4K3 b - - 0 1");
    expect(hangingPieces(game, "w")).toEqual([]);
  });

  it("une pièce non défendue attaquée par le roi est en prise", () => {
    const game = new Chess("8/8/8/4k3/3P4/8/8/4K3 b - - 0 1");
    expect(hangingPieces(game, "w")).toMatchObject([
      { square: "d4", cheapestAttacker: "k" },
    ]);
  });

  it("ne crie pas au loup pour une pièce attaquée à valeur égale et défendue", () => {
    const game = new Chess("3rk3/8/8/8/8/8/8/3RK3 w - - 0 1");
    expect(hangingPieces(game, "w")).toEqual([]);
    expect(hangingPieces(game, "b")).toEqual([]);
  });
});

describe("extractFacts", () => {
  it("position de départ : rien à signaler", () => {
    const facts = extractFacts({ fen: START });
    expect(facts.turn).toBe("w");
    expect(facts.inCheck).toBe(false);
    expect(facts.material).toEqual({ w: 39, b: 39 });
    expect(facts.dangers).toEqual({ hanging: [], checkThreats: [] });
    expect(facts.opportunities).toEqual({ hanging: [], checkingPieces: [] });
    expect(facts.secret).toEqual({ themes: [] });
  });

  it("mat en 1 : thème détecté, la tour peut faire échec", () => {
    const fen = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
    const facts = extractFacts({
      fen,
      analysis: analysisWith({ from: "a1", to: "a8" }),
    });
    expect(facts.secret.bestMove).toMatchObject({ san: "Ra8#", isMate: true });
    expect(facts.secret.themes).toContain("mate-in-1");
    expect(facts.opportunities.checkingPieces).toEqual([
      { type: "r", color: "w", square: "a1" },
    ]);
  });

  it("prise gratuite : la dame adverse non défendue", () => {
    const fen = "4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1";
    const facts = extractFacts({
      fen,
      analysis: analysisWith({ from: "e3", to: "d5" }),
    });
    expect(facts.opportunities.hanging).toMatchObject([
      { type: "q", square: "d5" },
    ]);
    expect(facts.secret.bestMove).toMatchObject({ captured: "q" });
    expect(facts.secret.themes).toContain("free-capture");
  });

  it("fourchette de cavalier : roi et tour attaqués en même temps", () => {
    const fen = "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1";
    const facts = extractFacts({
      fen,
      analysis: analysisWith({ from: "b5", to: "c7" }),
    });
    expect(facts.secret.bestMove).toMatchObject({ san: "Nc7+", isCheck: true });
    expect(facts.secret.themes).toEqual(["fork"]);
  });

  it("pas de fourchette pour un coup de roi", () => {
    // Le roi en e4 touche les deux tours adverses, mais un roi ne fait pas de fourchette.
    const fen = "7k/8/8/3r1r2/8/4K3/8/8 w - - 0 1";
    const facts = extractFacts({
      fen,
      analysis: analysisWith({ from: "e3", to: "e4" }),
    });
    expect(facts.secret.bestMove).toMatchObject({ san: "Ke4" });
    expect(facts.secret.themes).not.toContain("fork");
  });

  it("une promotion se juge avec la nouvelle pièce : dame qui attaque cavalier et tour", () => {
    const fen = "1n6/P7/8/8/8/8/r7/k6K w - - 0 1";
    const facts = extractFacts({
      fen,
      analysis: analysisWith({ from: "a7", to: "a8", promotion: "q" }),
    });
    expect(facts.secret.bestMove).toMatchObject({ san: "a8=Q" });
    expect(facts.secret.themes).not.toContain("fork");
  });

  it("signale la menace d'échec adverse (danger) et les échecs possibles du joueur (piste)", () => {
    // Après 1.f3 e5, aux blancs : la dame noire menace déjà Qh4+.
    const game = new Chess();
    for (const san of ["f3", "e5"]) game.move(san);
    const facts = extractFacts({ fen: game.fen() });
    expect(facts.dangers.checkThreats).toEqual([
      { type: "q", color: "b", square: "d8" },
    ]);
    // Après 2.g4, aux noirs : c'est maintenant une piste pour eux.
    game.move("g4");
    const next = extractFacts({ fen: game.fen() });
    expect(next.opportunities.checkingPieces).toEqual([
      { type: "q", color: "b", square: "d8" },
    ]);
  });

  it("garde le dernier coup et son classement", () => {
    const facts = extractFacts({
      fen: START,
      lastMove: { san: "g4", moveClass: "blunder" },
    });
    expect(facts.lastMove).toEqual({ san: "g4", moveClass: "blunder" });
  });
});

describe("describeEvaluation", () => {
  it("met l'évaluation en mots", () => {
    expect(
      describeEvaluation(analysisWith(null, { type: "cp", value: 20 })),
    ).toBe("position équilibrée");
    expect(
      describeEvaluation(analysisWith(null, { type: "cp", value: -250 })),
    ).toBe("net avantage pour les noirs");
    expect(
      describeEvaluation(analysisWith(null, { type: "mate", value: 3 })),
    ).toBe("mat forcé pour les blancs");
  });
});

describe("factsToPrompt", () => {
  const fen = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
  const prompt = factsToPrompt(
    extractFacts({
      fen,
      analysis: analysisWith(
        { from: "a1", to: "a8" },
        { type: "mate", value: 1 },
      ),
    }),
  );
  const [publicPart, secretPart] = prompt.split("SECRET");

  it("range le meilleur coup uniquement dans la partie secrète", () => {
    expect(secretPart).toContain("Ra8#");
    expect(secretPart).toContain("mat en un coup");
    expect(publicPart).not.toContain("Ra8");
    expect(publicPart).not.toContain("a8");
  });

  it("formule les faits publics en français", () => {
    expect(publicPart).toContain("Trait : blancs (le joueur que tu aides).");
    expect(publicPart).toContain(
      "Pièces du joueur qui peuvent faire échec : ta tour en a1.",
    );
  });

  it("accorde les participes au genre de la pièce", () => {
    const text = factsToPrompt(
      extractFacts({ fen: "4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1" }),
    );
    expect(text).toContain(
      "la dame adverse en d5 (attaquée 1 fois, dont par un cavalier ; non défendue)",
    );
  });
});
