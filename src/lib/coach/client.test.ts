import { describe, expect, it } from "vitest";
import { coachRequestSchema } from "@/lib/coach/schema";
import { buildCoachRequest, requestCoach } from "./client";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ANALYSIS = {
  score: { type: "cp" as const, value: 30 },
  bestMove: { from: "e2" as const, to: "e4" as const },
  pv: Array.from({ length: 40 }, () => "e2e4"),
  depth: 12,
};

function fakeFetch(response: Response | Error): typeof fetch {
  return (async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as typeof fetch;
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

describe("buildCoachRequest", () => {
  it("produit une demande acceptée par le schéma du serveur", () => {
    const body = buildCoachRequest({
      fen: START,
      hintLevel: 1,
      analysis: ANALYSIS,
      lastMove: { san: "e4", moveClass: "good" },
      question: "  Pourquoi pas d4 ?  ",
    });
    expect(coachRequestSchema.safeParse(body).success).toBe(true);
    expect(body.question).toBe("Pourquoi pas d4 ?");
    expect(body.analysis?.pv).toHaveLength(30);
  });

  it("n'envoie ni question vide ni champs absents", () => {
    const body = buildCoachRequest({
      fen: START,
      hintLevel: 1,
      question: "  ",
    });
    expect(body).toEqual({ fen: START, hintLevel: 1 });
  });
});

describe("requestCoach", () => {
  const body = buildCoachRequest({ fen: START, hintLevel: 1 });

  it("renvoie la réponse quand elle est bien formée", async () => {
    const reply = {
      message: "Regarde le centre. Quelle pièce peut y aller ?",
      highlights: ["d4", "e4"],
      arrows: [{ from: "g1", to: "f3" }],
      hintLevel: 1,
    };
    const outcome = await requestCoach(body, {
      fetchImpl: fakeFetch(json(reply)),
    });
    expect(outcome).toEqual({ ok: true, response: reply });
  });

  it("refuse une réponse mal formée (case inexistante)", async () => {
    const outcome = await requestCoach(body, {
      fetchImpl: fakeFetch(
        json({
          message: "Salut ?",
          highlights: ["z9"],
          arrows: [],
          hintLevel: 1,
        }),
      ),
    });
    expect(outcome).toMatchObject({ ok: false, kind: "invalid-response" });
  });

  it("trop de demandes : indique le délai en minutes", async () => {
    const outcome = await requestCoach(body, {
      fetchImpl: fakeFetch(
        json(
          { error: "x" },
          { status: 429, headers: { "Retry-After": "130" } },
        ),
      ),
    });
    expect(outcome).toMatchObject({ ok: false, kind: "rate-limited" });
    if (!outcome.ok) expect(outcome.message).toContain("3 min");
  });

  it.each([502, 503])(
    "erreur %i : coach indisponible, la partie continue",
    async (status) => {
      const outcome = await requestCoach(body, {
        fetchImpl: fakeFetch(json({ error: "x" }, { status })),
      });
      expect(outcome).toMatchObject({ ok: false, kind: "unavailable" });
      if (!outcome.ok) expect(outcome.message).toContain("La partie continue");
    },
  );

  it("erreur 400 : demande invalide", async () => {
    const outcome = await requestCoach(body, {
      fetchImpl: fakeFetch(json({ error: "x" }, { status: 400 })),
    });
    expect(outcome).toMatchObject({ ok: false, kind: "invalid-request" });
  });

  it("coupure réseau", async () => {
    const outcome = await requestCoach(body, {
      fetchImpl: fakeFetch(new TypeError("fetch failed")),
    });
    expect(outcome).toMatchObject({ ok: false, kind: "network" });
  });

  it("demande annulée (un coup a été joué entre-temps)", async () => {
    const controller = new AbortController();
    controller.abort();
    const outcome = await requestCoach(body, {
      signal: controller.signal,
      fetchImpl: fakeFetch(new DOMException("aborted", "AbortError")),
    });
    expect(outcome).toMatchObject({ ok: false, kind: "aborted" });
  });
});
