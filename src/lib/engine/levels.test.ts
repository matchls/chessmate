import { describe, expect, it } from "vitest";
import { BOT_LEVELS, DEFAULT_BOT_LEVEL, getBotLevel } from "./levels";

describe("niveaux du bot", () => {
  it("propose 800, 1000, 1200 et 1500, du plus faible au plus fort", () => {
    expect(BOT_LEVELS.map((level) => level.id)).toEqual([
      800, 1000, 1200, 1500,
    ]);
  });

  it("redéfinit toujours la force bridée, pour ne rien hériter du niveau précédent", () => {
    for (const level of BOT_LEVELS) {
      expect(level.options).toHaveProperty("UCI_LimitStrength");
      expect(level.options).toHaveProperty("Skill Level");
    }
  });

  it("n'utilise UCI_Elo qu'à partir de 1320, le minimum de Stockfish", () => {
    for (const level of BOT_LEVELS) {
      const elo = level.options.UCI_Elo;
      if (elo !== undefined) expect(Number(elo)).toBeGreaterThanOrEqual(1320);
      if (level.id < 1320) expect(level.options.UCI_LimitStrength).toBe(false);
    }
  });

  it("borne toujours la réflexion (profondeur ou temps)", () => {
    for (const level of BOT_LEVELS) {
      expect(level.limits.depth ?? level.limits.movetime).toBeDefined();
    }
  });

  it("le niveau par défaut existe", () => {
    expect(getBotLevel(DEFAULT_BOT_LEVEL).id).toBe(DEFAULT_BOT_LEVEL);
  });
});
