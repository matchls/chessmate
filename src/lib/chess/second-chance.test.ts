import { describe, expect, it } from "vitest";
import type { GameSettings } from "./game-settings";
import {
  botGate,
  chancesFor,
  chancesLabel,
  offerMessage,
  withoutLastMove,
} from "./second-chance";

const BOT_1000: GameSettings = {
  level: 1000,
  side: "white",
  timeControl: "none",
};

describe("seconde chance", () => {
  it("nombre de chances selon le niveau", () => {
    expect(chancesFor({ ...BOT_1000, level: 800 })).toBe(3);
    expect(chancesFor(BOT_1000)).toBe(3);
    expect(chancesFor({ ...BOT_1000, level: 1200 })).toBe(2);
    expect(chancesFor({ ...BOT_1000, level: 1500 })).toBe(0);
  });

  const gate = (patch: Partial<Parameters<typeof botGate>[0]>) =>
    botGate({
      settings: BOT_1000,
      used: 0,
      movesCount: 5,
      settledAt: null,
      lastMoveClass: "good",
      ...patch,
    });

  it("proposée seulement pour une erreur ou une gaffe", () => {
    expect(gate({ lastMoveClass: "blunder" })).toBe("wait-decision");
    expect(gate({ lastMoveClass: "mistake" })).toBe("wait-decision");
    expect(gate({ lastMoveClass: "inaccuracy" })).toBe("play");
    expect(gate({ lastMoveClass: "good" })).toBe("play");
  });

  it("le bot attend que le coup soit classé", () => {
    expect(gate({ lastMoveClass: undefined })).toBe("wait-analysis");
  });

  it("plus de chance, ou niveau 1500 : le bot joue sans attendre", () => {
    expect(gate({ used: 3, lastMoveClass: "blunder" })).toBe("play");
    expect(
      gate({
        settings: { ...BOT_1000, level: 1500 },
        lastMoveClass: undefined,
      }),
    ).toBe("play");
  });

  it("après « Continuer » sur ce coup, plus de proposition ; au coup suivant, de nouveau", () => {
    expect(gate({ settledAt: 5, lastMoveClass: "blunder" })).toBe("play");
    expect(gate({ settledAt: 3, lastMoveClass: "blunder" })).toBe(
      "wait-decision",
    );
  });

  it("rejouer retire le dernier coup", () => {
    const moves = [
      { from: "e2", to: "e4" },
      { from: "e7", to: "e5" },
      { from: "d1", to: "h5" },
    ] as const;
    expect(withoutLastMove(moves)).toEqual(moves.slice(0, 2));
  });

  it("textes", () => {
    expect(offerMessage("blunder")).toContain("Gaffe (??)");
    expect(offerMessage("mistake")).toContain("Erreur (?)");
    expect(chancesLabel(2, 3)).toBe("Secondes chances : 2/3");
  });
});
