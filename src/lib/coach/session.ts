import {
  HINT_LEVELS,
  type CoachResponse,
  type HintLevel,
} from "@/lib/coach/schema";

/**
 * Une « séance » de coach sur une position : les indices déjà révélés (niveau 1, puis 2,
 * puis 3), la dernière question posée, et ce qui est affiché sur l'échiquier.
 * Une nouvelle position = une nouvelle séance : le niveau repart à 1 après chaque coup.
 * Fonctions pures, sans React, pour être testées simplement.
 */

export type CoachSession = {
  fen: string;
  /** Indices révélés, dans l'ordre : hints[0] est le niveau 1. */
  hints: CoachResponse[];
  /** Dernière question posée, et sa réponse quand elle est arrivée. */
  exchange?: { question: string; response?: CoachResponse };
  /** Réponse dont les cases et flèches sont affichées sur l'échiquier. */
  latest: CoachResponse | null;
  loading: boolean;
  error: string | null;
};

const MAX_LEVEL = HINT_LEVELS[HINT_LEVELS.length - 1];

export function emptySession(fen: string): CoachSession {
  return { fen, hints: [], latest: null, loading: false, error: null };
}

/** Niveau du prochain indice, ou null si les trois ont déjà été donnés. */
export function nextHintLevel(session: CoachSession): HintLevel | null {
  const next = session.hints.length + 1;
  return next <= MAX_LEVEL ? (next as HintLevel) : null;
}

/**
 * Niveau transmis avec une question : celui déjà atteint (1 au minimum).
 * Le coach n'en sait jamais plus que ce que le joueur a déjà débloqué.
 */
export function questionLevel(session: CoachSession): HintLevel {
  return Math.max(1, session.hints.length) as HintLevel;
}

const BUTTON_LABELS = [
  "Un indice ?",
  "Un autre indice ?",
  "Dernier indice",
  "À toi de jouer !",
] as const;

export function hintButtonLabel(session: CoachSession): string {
  return BUTTON_LABELS[Math.min(session.hints.length, MAX_LEVEL)];
}

export function startHint(session: CoachSession): CoachSession {
  return { ...session, loading: true, error: null };
}

export function startQuestion(
  session: CoachSession,
  question: string,
): CoachSession {
  return { ...session, loading: true, error: null, exchange: { question } };
}

export function receiveHint(
  session: CoachSession,
  response: CoachResponse,
): CoachSession {
  return {
    ...session,
    hints: [...session.hints, response],
    latest: response,
    loading: false,
  };
}

export function receiveAnswer(
  session: CoachSession,
  response: CoachResponse,
): CoachSession {
  return {
    ...session,
    exchange: session.exchange && { ...session.exchange, response },
    latest: response,
    loading: false,
  };
}

export function fail(session: CoachSession, message: string): CoachSession {
  return { ...session, loading: false, error: message };
}
