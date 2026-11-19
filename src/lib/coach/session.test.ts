import { describe, expect, it } from "vitest";
import type { CoachResponse, HintLevel } from "./schema";
import {
  emptySession,
  fail,
  hintButtonLabel,
  nextHintLevel,
  questionLevel,
  receiveAnswer,
  receiveHint,
  startHint,
  startQuestion,
} from "./session";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const reply = (hintLevel: HintLevel, highlights: string[] = []) =>
  ({
    message: `Indice ${hintLevel} ?`,
    highlights,
    arrows: [],
    hintLevel,
  }) as CoachResponse;

describe("séance de coach", () => {
  it("les indices montent 1 → 2 → 3, puis s'arrêtent", () => {
    let session = emptySession(FEN);
    const seen: (HintLevel | null)[] = [];
    for (let step = 0; step < 4; step++) {
      const level = nextHintLevel(session);
      seen.push(level);
      if (level) session = receiveHint(startHint(session), reply(level));
    }
    expect(seen).toEqual([1, 2, 3, null]);
    expect(session.hints.map((hint) => hint.hintLevel)).toEqual([1, 2, 3]);
  });

  it("le bouton change de libellé à chaque indice", () => {
    let session = emptySession(FEN);
    const labels = [hintButtonLabel(session)];
    for (const level of [1, 2, 3] as const) {
      session = receiveHint(session, reply(level));
      labels.push(hintButtonLabel(session));
    }
    expect(labels).toEqual([
      "Un indice ?",
      "Un autre indice ?",
      "Dernier indice",
      "À toi de jouer !",
    ]);
  });

  it("une question utilise le niveau déjà atteint, 1 au minimum", () => {
    let session = emptySession(FEN);
    expect(questionLevel(session)).toBe(1);
    session = receiveHint(session, reply(1));
    expect(questionLevel(session)).toBe(1);
    session = receiveHint(session, reply(2));
    expect(questionLevel(session)).toBe(2);
  });

  it("l'échiquier affiche la dernière réponse, indice ou question", () => {
    let session = receiveHint(emptySession(FEN), reply(1, ["e4"]));
    expect(session.latest?.highlights).toEqual(["e4"]);
    session = startQuestion(session, "Pourquoi pas d4 ?");
    expect(session.loading).toBe(true);
    session = receiveAnswer(session, reply(1, ["d4"]));
    expect(session.latest?.highlights).toEqual(["d4"]);
    expect(session.exchange?.question).toBe("Pourquoi pas d4 ?");
    expect(session.exchange?.response?.highlights).toEqual(["d4"]);
    expect(session.hints).toHaveLength(1);
  });

  it("une erreur n'efface pas les indices déjà reçus", () => {
    let session = receiveHint(emptySession(FEN), reply(1));
    session = fail(startHint(session), "Coach indisponible");
    expect(session).toMatchObject({
      loading: false,
      error: "Coach indisponible",
    });
    expect(session.hints).toHaveLength(1);
    expect(nextHintLevel(session)).toBe(2);
  });
});
