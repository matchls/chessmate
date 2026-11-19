"use client";

import { useEffect, useRef, useState } from "react";
import { requestCoach, type CoachRequestInput } from "@/lib/coach/client";
import type { CoachResponse } from "@/lib/coach/schema";

export type CoachState =
  | { status: "idle" }
  | { status: "loading"; question?: string }
  | { status: "answer"; response: CoachResponse; question?: string }
  | { status: "error"; message: string };

const IDLE: CoachState = { status: "idle" };

/**
 * État du coach pour la position affichée. La réponse est liée à une position (FEN) :
 * dès qu'un coup est joué, elle disparaît, et une demande encore en cours est annulée.
 */
export function useCoach(fen: string) {
  const [entry, setEntry] = useState<{ fen: string; state: CoachState }>({
    fen,
    state: IDLE,
  });
  const controllerRef = useRef<AbortController | null>(null);

  // Nouvelle position (ou fermeture de la page) : on raccroche la demande en cours.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [fen]);

  const state = entry.fen === fen ? entry.state : IDLE;

  async function ask(request: CoachRequestInput) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const question = request.question;
    setEntry({ fen, state: { status: "loading", question } });

    const outcome = await requestCoach(request, { signal: controller.signal });
    if (controller.signal.aborted) return;
    controllerRef.current = null;
    setEntry({
      fen,
      state: outcome.ok
        ? { status: "answer", response: outcome.response, question }
        : { status: "error", message: outcome.message },
    });
  }

  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setEntry({ fen, state: IDLE });
  }

  return { state, ask, reset };
}
