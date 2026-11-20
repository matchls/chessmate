import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHOICE,
  resolveSettings,
  settingsSummary,
} from "./game-settings";

describe("réglages de partie", () => {
  it("par défaut : bot 1000, blancs", () => {
    expect(resolveSettings(DEFAULT_CHOICE)).toEqual({
      mode: "bot",
      level: 1000,
      side: "white",
    });
  });

  it("« au hasard » est tiré au lancement, une fois pour toutes", () => {
    const choice = { ...DEFAULT_CHOICE, side: "random" as const };
    expect(resolveSettings(choice, () => 0.2).side).toBe("white");
    expect(resolveSettings(choice, () => 0.8).side).toBe("black");
  });

  it("à deux : ni niveau ni camp du joueur", () => {
    expect(
      resolveSettings({ mode: "local", level: 1500, side: "black" }),
    ).toEqual({ mode: "local", level: null, side: "white" });
  });

  it("résumé affiché pendant la partie", () => {
    expect(settingsSummary({ mode: "bot", level: 1200, side: "black" })).toBe(
      "Bot 1200 · tu joues les noirs",
    );
    expect(settingsSummary({ mode: "local", level: null, side: "white" })).toBe(
      "À deux sur le même écran",
    );
  });
});
