import { describe, expect, it, vi } from "vitest";
import { askExplain } from "./coach";
import {
  explainSolution,
  explainWhy,
  extractMistakeFacts,
  mistakeFactsToPrompt,
} from "./explain";
import { messageLeaksMove } from "./guard";
import type { LLMProvider } from "./provider";
import { explainRequestSchema, type ExplainRequest } from "./schema";

type Move = { from: string; to: string };

function request({
  fen,
  played,
  best,
  reply,
  step = "why",
  moveClass = "blunder",
}: {
  fen: string;
  played: Move;
  best: Move;
  reply?: Move;
  step?: "why" | "solution";
  moveClass?: "inaccuracy" | "mistake" | "blunder";
}): ExplainRequest {
  return explainRequestSchema.parse({
    kind: "explain",
    step,
    fenBefore: fen,
    played,
    moveClass,
    before: {
      score: { type: "cp", value: 0 },
      bestMove: best,
      pv: [],
      depth: 12,
    },
    ...(reply
      ? {
          after: {
            score: { type: "cp", value: -500 },
            bestMove: reply,
            pv: [],
            depth: 12,
          },
        }
      : {}),
  });
}

/** Vérifie qu'une explication « pourquoi » ne révèle jamais la solution. */
function why(input: Parameters<typeof request>[0]) {
  const req = request(input);
  const result = explainWhy(extractMistakeFacts(req));
  if (result) {
    expect(
      messageLeaksMove(result.message, req.fenBefore, req.before.bestMove),
    ).toBe(false);
  }
  return result;
}

// Coup du berger côté noir : 3… Cf6?? permet Dxf7#.
const BERGER =
  "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3";
const MATE_IN_ONE = "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("explication « pourquoi ? » écrite par le code", () => {
  it("mat permis à l'adversaire : la réplique en flèche, le roi entouré", () => {
    const result = why({
      fen: BERGER,
      played: { from: "g8", to: "f6" },
      best: { from: "d8", to: "e7" },
      reply: { from: "h5", to: "f7" },
    });
    expect(result?.message).toContain(
      "la dame adverse en h5 peut donner échec et mat",
    );
    expect(result?.arrows).toEqual([{ from: "h5", to: "f7" }]);
    expect(result?.highlights).toEqual(["e8"]);
  });

  it("mat manqué : idée seulement, ni la pièce ni la case", () => {
    const result = why({
      fen: MATE_IN_ONE,
      played: { from: "g1", to: "f2" },
      best: { from: "a1", to: "a8" },
      reply: { from: "g8", to: "f8" },
    });
    expect(result?.message).toContain("échec et mat en un coup");
    expect(result?.message).not.toMatch(/a8|tour/);
    expect(result?.arrows).toEqual([]);
  });

  it("pièce laissée en prise : qui la prend, et la question de la protéger", () => {
    const result = why({
      fen: "4k3/8/8/1p6/8/8/8/3QK3 w - - 0 1",
      played: { from: "d1", to: "a4" },
      best: { from: "d1", to: "d2" },
      reply: { from: "b5", to: "a4" },
    });
    expect(result?.message).toContain(
      "ta dame en a4 n'est plus assez défendue",
    );
    expect(result?.message).toContain("le pion adverse en b5 peut la prendre");
    expect(result?.highlights).toEqual(["a4"]);
    expect(result?.arrows).toEqual([{ from: "b5", to: "a4" }]);
  });

  it("fourchette permise", () => {
    const result = why({
      fen: "r4k2/8/8/1N6/8/8/8/4K3 b - - 0 1",
      played: { from: "f8", to: "e8" },
      best: { from: "f8", to: "g7" },
      reply: { from: "b5", to: "c7" },
    });
    expect(result?.message).toContain(
      "le cavalier adverse en b5 peut attaquer deux de tes pièces",
    );
    expect(result?.arrows).toEqual([{ from: "b5", to: "c7" }]);
  });

  it("prise gratuite manquée : sans nommer la cible", () => {
    const result = why({
      fen: "4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1",
      played: { from: "e1", to: "f1" },
      best: { from: "e3", to: "d5" },
      reply: { from: "d5", to: "a2" },
    });
    expect(result?.message).toContain("gagner du matériel");
    expect(result?.message).not.toMatch(/d5|dame/);
  });

  it("cas non reconnu : null, le modèle prendra le relais", () => {
    expect(
      why({
        fen: START,
        played: { from: "a2", to: "a3" },
        best: { from: "e2", to: "e4" },
        reply: { from: "e7", to: "e5" },
        moveClass: "inaccuracy",
      }),
    ).toBeNull();
  });

  it("les faits envoyés au modèle à l'étape « pourquoi » ne contiennent pas le meilleur coup", () => {
    const req = request({
      fen: START,
      played: { from: "a2", to: "a3" },
      best: { from: "e2", to: "e4" },
      reply: { from: "e7", to: "e5" },
    });
    const facts = extractMistakeFacts(req);
    expect(mistakeFactsToPrompt(facts, "why")).not.toMatch(/e4/);
    expect(mistakeFactsToPrompt(facts, "solution")).toMatch(/e4/);
  });
});

describe("solution", () => {
  it("le coup vient de Stockfish, en notation française, avec sa flèche", () => {
    const req = request({
      fen: MATE_IN_ONE,
      played: { from: "g1", to: "f2" },
      best: { from: "a1", to: "a8" },
      step: "solution",
    });
    const result = explainSolution(extractMistakeFacts(req));
    expect(result?.message).toContain(
      "Le meilleur coup était Ta8# : échec et mat !",
    );
    expect(result?.arrows).toEqual([{ from: "a1", to: "a8" }]);
  });
});

describe("askExplain", () => {
  const provider = (reply: string): LLMProvider => ({
    name: "groq",
    model: "faux",
    complete: vi.fn(async () => reply),
  });

  it("cas reconnu : texte du code, sans appel au modèle ; visuels sur la position d'après", async () => {
    const getProvider = vi.fn(() => provider("{}"));
    const result = await askExplain(
      request({
        fen: BERGER,
        played: { from: "g8", to: "f6" },
        best: { from: "d8", to: "e7" },
        reply: { from: "h5", to: "f7" },
      }),
      getProvider,
    );
    expect(result).toMatchObject({
      source: "template",
      step: "why",
      board: "after",
    });
    expect(getProvider).not.toHaveBeenCalled();
  });

  const calm = (step: "why" | "solution") =>
    request({
      fen: START,
      played: { from: "a2", to: "a3" },
      best: { from: "e2", to: "e4" },
      reply: { from: "e7", to: "e5" },
      moveClass: "inaccuracy",
      step,
    });

  it("« pourquoi » par le modèle : le meilleur coup est bloqué, flèche = réplique adverse", async () => {
    const leaked = await askExplain(calm("why"), () =>
      provider(JSON.stringify({ message: "Il fallait jouer e4 ?" })),
    );
    expect(leaked.issues).toContain("leak-message");
    expect(leaked.message).not.toMatch(/e4/);
    expect(leaked.arrows).toEqual([{ from: "e7", to: "e5" }]);

    const fine = await askExplain(calm("why"), () =>
      provider(
        JSON.stringify({
          message: "Ce coup ne développe rien. Quelle pièce aurait pu sortir ?",
          arrows: [{ from: "e2", to: "e4" }],
        }),
      ),
    );
    expect(fine).toMatchObject({ source: "model", board: "after" });
    expect(fine.issues).not.toContain("leak-message");
    expect(fine.message).toContain("ne développe rien");
    expect(fine.arrows).toEqual([{ from: "e7", to: "e5" }]);
  });

  it("« solution » par le modèle : le coup peut être cité, la flèche vient de Stockfish", async () => {
    const result = await askExplain(calm("solution"), () =>
      provider(
        JSON.stringify({
          message:
            "e4 occupe le centre et libère ta dame et ton fou. Tu vois ?",
          arrows: [{ from: "d2", to: "d4" }],
        }),
      ),
    );
    expect(result).toMatchObject({
      source: "model",
      step: "solution",
      board: "before",
    });
    expect(result.message).toContain("e4 occupe le centre");
    expect(result.arrows).toEqual([{ from: "e2", to: "e4" }]);
  });

  it("réponse illisible du modèle : repli qui cite la solution de Stockfish", async () => {
    const result = await askExplain(calm("solution"), () =>
      provider("pas du JSON"),
    );
    expect(result.message).toContain(
      "Le meilleur coup selon Stockfish était e4",
    );
  });
});

describe("schéma de la demande d'explication", () => {
  const base = {
    kind: "explain",
    step: "why",
    fenBefore: START,
    played: { from: "a2", to: "a3" },
    moveClass: "inaccuracy",
    before: {
      score: { type: "cp", value: 0 },
      bestMove: { from: "e2", to: "e4" },
      pv: [],
      depth: 12,
    },
  };

  it("accepte une demande cohérente", () => {
    expect(explainRequestSchema.safeParse(base).success).toBe(true);
  });

  it("refuse un coup joué illégal", () => {
    expect(
      explainRequestSchema.safeParse({
        ...base,
        played: { from: "a2", to: "a5" },
      }).success,
    ).toBe(false);
  });

  it("refuse un meilleur coup illégal et une réplique illégale", () => {
    expect(
      explainRequestSchema.safeParse({
        ...base,
        before: { ...base.before, bestMove: { from: "e2", to: "e6" } },
      }).success,
    ).toBe(false);
    expect(
      explainRequestSchema.safeParse({
        ...base,
        after: { ...base.before, bestMove: { from: "e2", to: "e4" } },
      }).success,
    ).toBe(false);
  });

  it("refuse un « bon » coup (rien à expliquer)", () => {
    expect(
      explainRequestSchema.safeParse({ ...base, moveClass: "good" }).success,
    ).toBe(false);
  });
});
