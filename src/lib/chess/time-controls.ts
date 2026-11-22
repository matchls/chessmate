/**
 * Cadences proposées : temps de base par joueur + incrément (secondes ajoutées après chaque
 * coup joué). « 5+2 » : 5 minutes chacun, +2 secondes par coup.
 */

export type TimeControlId = "none" | "5+2" | "5+5" | "10+5" | "15+10";

export type TimeControl = {
  id: TimeControlId;
  label: string;
  /** Temps de départ de chaque joueur, en millisecondes (null : sans limite). */
  baseMs: number | null;
  incrementMs: number;
};

const MINUTE = 60_000;
const SECOND = 1000;

export const TIME_CONTROLS: readonly TimeControl[] = [
  { id: "none", label: "Sans limite", baseMs: null, incrementMs: 0 },
  { id: "5+2", label: "5+2", baseMs: 5 * MINUTE, incrementMs: 2 * SECOND },
  { id: "5+5", label: "5+5", baseMs: 5 * MINUTE, incrementMs: 5 * SECOND },
  { id: "10+5", label: "10+5", baseMs: 10 * MINUTE, incrementMs: 5 * SECOND },
  {
    id: "15+10",
    label: "15+10",
    baseMs: 15 * MINUTE,
    incrementMs: 10 * SECOND,
  },
];

export const TIME_CONTROL_IDS = TIME_CONTROLS.map((control) => control.id) as [
  TimeControlId,
  ...TimeControlId[],
];

export const DEFAULT_TIME_CONTROL: TimeControlId = "none";

export function getTimeControl(id: TimeControlId): TimeControl {
  const control = TIME_CONTROLS.find((candidate) => candidate.id === id);
  if (!control) throw new Error(`Cadence inconnue : ${id}`);
  return control;
}

/** Cadence au format PGN (« 300+2 »), « - » sans limite. */
export function pgnTimeControl(id: TimeControlId): string {
  const { baseMs, incrementMs } = getTimeControl(id);
  if (baseMs === null) return "-";
  return `${baseMs / SECOND}+${incrementMs / SECOND}`;
}

/** Bornes du temps de réflexion affiché du bot. */
export const BOT_THINK_MIN_MS = 500;
export const BOT_THINK_MAX_MS = 10_000;

/**
 * Temps que le bot « prend » avant de jouer, en partie chronométrée : environ 1/40 du temps
 * restant + la moitié de l'incrément, avec un peu de hasard (±30 %), borné entre 0,5 et 10 s.
 * Jamais plus de la moitié de son temps restant : le bot ne perd pas bêtement au temps.
 */
export function botThinkMs(
  remainingMs: number,
  incrementMs: number,
  random: () => number = Math.random,
): number {
  const base = remainingMs / 40 + incrementMs / 2;
  const jitter = 0.7 + random() * 0.6;
  const clamped = Math.min(
    Math.max(base * jitter, BOT_THINK_MIN_MS),
    BOT_THINK_MAX_MS,
  );
  return Math.max(0, Math.min(clamped, remainingMs / 2));
}

/** Affichage d'une pendule : « 4:05 » ; sous 10 s, avec les dixièmes : « 9.4 ». */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < 10 * SECOND) {
    const tenths = Math.floor(safe / 100);
    return `${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const totalSeconds = Math.floor(safe / SECOND);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Sous ce seuil, la pendule passe en alerte (bordeaux, dixièmes). */
export const LOW_TIME_MS = 10 * SECOND;
