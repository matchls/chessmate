import { DEFAULT_BOT_LEVEL, type BotLevelId } from "@/lib/engine/levels";
import {
  DEFAULT_TIME_CONTROL,
  getTimeControl,
  type TimeControlId,
} from "@/lib/chess/time-controls";

/**
 * Réglages d'une partie contre le bot, choisis dans la fenêtre « Nouvelle partie » puis figés
 * jusqu'à la partie suivante. Ils restent rangés avec la partie : le niveau sert au calcul Elo.
 */

export type Side = "white" | "black";
export type SideChoice = Side | "random";

/** Ce que le joueur choisit dans la fenêtre (la couleur peut être « au hasard »). */
export type SettingsChoice = {
  level: BotLevelId;
  side: SideChoice;
  timeControl: TimeControlId;
};

/** Réglages définitifs d'une partie. */
export type GameSettings = {
  level: BotLevelId;
  side: Side;
  timeControl: TimeControlId;
};

export const DEFAULT_CHOICE: SettingsChoice = {
  level: DEFAULT_BOT_LEVEL,
  side: "white",
  timeControl: DEFAULT_TIME_CONTROL,
};

/** Transforme un choix en réglages définitifs ; « au hasard » est tiré ici, une fois. */
export function resolveSettings(
  choice: SettingsChoice,
  random: () => number = Math.random,
): GameSettings {
  const side: Side =
    choice.side === "random"
      ? random() < 0.5
        ? "white"
        : "black"
      : choice.side;
  return { level: choice.level, side, timeControl: choice.timeControl };
}

/**
 * Résumé affiché pendant la partie, par exemple « Bot 1000 · tu joues les blancs », suivi de la
 * cadence pour une partie chronométrée (« · 5+2 »).
 */
export function settingsSummary(settings: GameSettings): string {
  const side = settings.side === "white" ? "les blancs" : "les noirs";
  const timed =
    settings.timeControl === DEFAULT_TIME_CONTROL
      ? ""
      : ` · ${getTimeControl(settings.timeControl).label}`;
  return `Bot ${settings.level} · tu joues ${side}${timed}`;
}
