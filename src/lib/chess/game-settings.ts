import { DEFAULT_BOT_LEVEL, type BotLevelId } from "@/lib/engine/levels";

/**
 * Réglages d'une partie, choisis dans la fenêtre « Nouvelle partie » puis figés jusqu'à la
 * partie suivante. Ils restent rangés avec la partie : le niveau servira au calcul Elo (#12).
 */

export type Side = "white" | "black";
export type Mode = "bot" | "local";
export type SideChoice = Side | "random";

/** Ce que le joueur choisit dans la fenêtre (la couleur peut être « au hasard »). */
export type SettingsChoice = {
  mode: Mode;
  level: BotLevelId;
  side: SideChoice;
};

/** Réglages définitifs d'une partie. À deux, pas de niveau ni de camp « du joueur ». */
export type GameSettings =
  | { mode: "bot"; level: BotLevelId; side: Side }
  | { mode: "local"; level: null; side: "white" };

export const DEFAULT_CHOICE: SettingsChoice = {
  mode: "bot",
  level: DEFAULT_BOT_LEVEL,
  side: "white",
};

/** Transforme un choix en réglages définitifs ; « au hasard » est tiré ici, une fois. */
export function resolveSettings(
  choice: SettingsChoice,
  random: () => number = Math.random,
): GameSettings {
  if (choice.mode === "local") {
    return { mode: "local", level: null, side: "white" };
  }
  const side: Side =
    choice.side === "random"
      ? random() < 0.5
        ? "white"
        : "black"
      : choice.side;
  return { mode: "bot", level: choice.level, side };
}

/** Résumé affiché pendant la partie, par exemple « Bot 1000 · tu joues les blancs ». */
export function settingsSummary(settings: GameSettings): string {
  if (settings.mode === "local") return "À deux sur le même écran";
  const side = settings.side === "white" ? "les blancs" : "les noirs";
  return `Bot ${settings.level} · tu joues ${side}`;
}
