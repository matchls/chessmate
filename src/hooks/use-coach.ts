"use client";

import { useEffect, useRef, useState } from "react";
import { requestCoach, type CoachRequestInput } from "@/lib/coach/client";
import type { CoachResponse, HintLevel } from "@/lib/coach/schema";
import {
  emptySession,
  fail,
  nextHintLevel,
  questionLevel,
  receiveAnswer,
  receiveHint,
  startHint,
  startQuestion,
  type CoachSession,
} from "@/lib/coach/session";

type MakeRequest = (
  hintLevel: HintLevel,
  question?: string,
) => CoachRequestInput;

/**
 * Séance de coach pour la position affichée. Elle est liée à une position (FEN) : dès
 * qu'un coup est joué, tout repart à zéro, et une demande encore en cours est annulée.
 */
export function useCoach(fen: string) {
  const [stored, setStored] = useState<CoachSession>(() => emptySession(fen));
  const controllerRef = useRef<AbortController | null>(null);

  // Nouvelle position (ou fermeture de la page) : on raccroche la demande en cours.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fen]);

  const session = stored.fen === fen ? stored : emptySession(fen);

  async function send(
    request: CoachRequestInput,
    start: (current: CoachSession) => CoachSession,
    receive: (current: CoachSession, response: CoachResponse) => CoachSession,
  ) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStored(start(session));

    const outcome = await requestCoach(request, { signal: controller.signal });
    if (controller.signal.aborted) return;
    controllerRef.current = null;
    setStored((current) => {
      if (current.fen !== fen) return current;
      return outcome.ok
        ? receive(current, outcome.response)
        : fail(current, outcome.message);
    });
  }

  function askHint(makeRequest: MakeRequest) {
    const level = nextHintLevel(session);
    if (!level || session.loading) return;
    void send(makeRequest(level), startHint, receiveHint);
  }

  function askQuestion(question: string, makeRequest: MakeRequest) {
    if (session.loading) return;
    const request = makeRequest(questionLevel(session), question);
    void send(
      request,
      (current) => startQuestion(current, question),
      receiveAnswer,
    );
  }

  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStored(emptySession(fen));
  }

  return { session, askHint, askQuestion, reset };
}
