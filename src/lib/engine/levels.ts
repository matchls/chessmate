import type { EngineOptionValue, GoLimits } from "@/lib/engine/uci";

export type BotLevelId = 800 | 1000 | 1200 | 1500;

export type BotLevel = {
  id: BotLevelId;
  label: string;
  /** Options UCI envoyées avant chaque coup du bot (toutes redéfinies, pour ne rien hériter). */
  options: Record<string, EngineOptionValue>;
  limits: GoLimits;
};

/**
 * Correspondance niveau → réglages de Stockfish.
 *
 * Stockfish ne sait pas viser un Elo sous 1320 (`UCI_Elo` a ce minimum). Pour 800 à 1200, on
 * le bride à la main : `Skill Level` bas (il choisit volontairement des coups moins bons),
 * peu de profondeur et peu de temps. Ces niveaux sont donc approximatifs et seront ajustés
 * en jouant. À 1500, on utilise le réglage Elo officiel.
 */
export const BOT_LEVELS: readonly BotLevel[] = [
  {
    id: 800,
    label: "800",
    options: { UCI_LimitStrength: false, "Skill Level": 0 },
    limits: { depth: 1, movetime: 50 },
  },
  {
    id: 1000,
    label: "1000",
    options: { UCI_LimitStrength: false, "Skill Level": 3 },
    limits: { depth: 2, movetime: 100 },
  },
  {
    id: 1200,
    label: "1200",
    options: { UCI_LimitStrength: false, "Skill Level": 6 },
    limits: { depth: 4, movetime: 200 },
  },
  {
    id: 1500,
    label: "1500",
    options: { "Skill Level": 20, UCI_LimitStrength: true, UCI_Elo: 1500 },
    limits: { movetime: 500 },
  },
];

export const DEFAULT_BOT_LEVEL: BotLevelId = 1000;

export function getBotLevel(id: BotLevelId): BotLevel {
  const level = BOT_LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Niveau de bot inconnu : ${id}`);
  return level;
}

/** Délai avant que le bot joue, pour qu'il ne réponde pas instantanément (en ms). */
export const BOT_MOVE_DELAY_MS = 400;
