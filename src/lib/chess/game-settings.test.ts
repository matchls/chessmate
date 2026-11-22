import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHOICE,
  resolveSettings,
  settingsSummary,
} from "./game-settings";

describe("réglages de partie", () => {
  it("par défaut : bot 1000, blancs, sans limite de temps", () => {
    expect(resolveSettings(DEFAULT_CHOICE)).toEqual({
      level: 1000,
      side: "white",
      timeControl: "none",
    });
  });

  it("« au hasard » est tiré au lancement, une fois pour toutes", () => {
    const choice = { ...DEFAULT_CHOICE, side: "random" as const };
    expect(resolveSettings(choice, () => 0.2).side).toBe("white");
    expect(resolveSettings(choice, () => 0.8).side).toBe("black");
  });

  it("résumé affiché pendant la partie", () => {
    expect(
      settingsSummary({ level: 1200, side: "black", timeControl: "none" }),
    ).toBe("Bot 1200 · tu joues les noirs");
  });

  it("le résumé indique la cadence d'une partie chronométrée", () => {
    expect(
      settingsSummary({ level: 1000, side: "white", timeControl: "5+2" }),
    ).toBe("Bot 1000 · tu joues les blancs · 5+2");
  });

  it("la cadence choisie est gardée telle quelle", () => {
    const choice = { ...DEFAULT_CHOICE, timeControl: "10+5" as const };
    expect(resolveSettings(choice).timeControl).toBe("10+5");
  });
});
