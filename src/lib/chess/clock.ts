import type { Color } from "@/lib/chess/game";
import { getTimeControl, type TimeControlId } from "@/lib/chess/time-controls";

/**
 * Pendule d'échecs, en fonctions pures : l'heure (`now`, en ms) est toujours fournie de
 * l'extérieur, ce qui rend la pendule testable sans attendre.
 *
 * Fonctionnement : un « tic » régulier retire le temps écoulé au camp au trait (seulement si la
 * pendule tourne) ; appuyer sur la pendule après un coup ajoute l'incrément et passe la main.
 */
export type ClockState = {
  /** Temps restant de chaque camp, en ms (peut passer sous 0 : temps écoulé). */
  remaining: Record<Color, number>;
  /** Camp dont la pendule descend. */
  turn: Color;
  /** Instant du dernier tic : le temps écoulé depuis est encore à retirer. */
  lastTick: number;
  incrementMs: number;
  /** État juste avant le dernier appui, pour annuler un coup (seconde chance). */
  previous: Omit<ClockState, "previous"> | null;
};

const other = (color: Color): Color => (color === "w" ? "b" : "w");

/** Nouvelle pendule (null pour une partie sans limite). Les blancs commencent. */
export function createClock(id: TimeControlId, now: number): ClockState | null {
  const { baseMs, incrementMs } = getTimeControl(id);
  if (baseMs === null) return null;
  return {
    remaining: { w: baseMs, b: baseMs },
    turn: "w",
    lastTick: now,
    incrementMs,
    previous: null,
  };
}

/** Avance la pendule jusqu'à `now`. En pause (`running` faux), rien n'est décompté. */
export function tick(
  state: ClockState,
  now: number,
  running: boolean,
): ClockState {
  const elapsed = running ? Math.max(0, now - state.lastTick) : 0;
  return {
    ...state,
    remaining: {
      ...state.remaining,
      [state.turn]: state.remaining[state.turn] - elapsed,
    },
    lastTick: now,
  };
}

/** Camp tombé au temps (null : personne). */
export function flagged(state: ClockState | null): Color | null {
  if (!state) return null;
  return state.remaining[state.turn] <= 0 ? state.turn : null;
}

/**
 * Appui sur la pendule après un coup : décompte le temps écoulé, ajoute l'incrément au camp qui
 * vient de jouer et passe la main. Si son temps était déjà écoulé, rien ne change : il a perdu.
 */
export function press(
  state: ClockState,
  now: number,
  running = true,
): ClockState {
  const current = tick(state, now, running);
  if (flagged(current)) return current;
  const snapshot = {
    remaining: current.remaining,
    turn: current.turn,
    lastTick: current.lastTick,
    incrementMs: current.incrementMs,
  };
  return {
    ...current,
    remaining: {
      ...current.remaining,
      [current.turn]: current.remaining[current.turn] + current.incrementMs,
    },
    turn: other(current.turn),
    previous: snapshot,
  };
}

/**
 * Annule le dernier appui (« Rejouer » d'une seconde chance) : la pendule revient à l'instant
 * où le coup a été joué. Le temps de réflexion reste consommé, l'incrément est retiré.
 */
export function undoPress(state: ClockState, now: number): ClockState {
  if (!state.previous) return state;
  return { ...state.previous, lastTick: now, previous: null };
}

/** Temps restant affiché, jamais négatif. */
export function remainingMs(state: ClockState, color: Color): number {
  return Math.max(0, state.remaining[color]);
}
