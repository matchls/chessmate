import { describe, expect, it } from "vitest";
import {
  createClock,
  flagged,
  press,
  remainingMs,
  tick,
  undoPress,
  type ClockState,
} from "./clock";

const start = (): ClockState => {
  const clock = createClock("5+2", 0);
  if (!clock) throw new Error("pendule attendue");
  return clock;
};

describe("pendule", () => {
  it("sans limite : pas de pendule", () => {
    expect(createClock("none", 0)).toBeNull();
  });

  it("au départ : 5 minutes chacun, les blancs au trait", () => {
    const clock = start();
    expect(clock.remaining).toEqual({ w: 300_000, b: 300_000 });
    expect(clock.turn).toBe("w");
  });

  it("le tic retire le temps écoulé au camp au trait seulement", () => {
    const clock = tick(start(), 1500, true);
    expect(clock.remaining).toEqual({ w: 298_500, b: 300_000 });
  });

  it("en pause, rien n'est décompté", () => {
    const clock = tick(start(), 60_000, false);
    expect(clock.remaining.w).toBe(300_000);
    // La pause finie, seul le temps écoulé depuis la reprise compte.
    expect(tick(clock, 61_000, true).remaining.w).toBe(299_000);
  });

  it("appuyer : décompte, ajoute l'incrément et passe la main", () => {
    const clock = press(start(), 10_000);
    expect(clock.remaining).toEqual({ w: 292_000, b: 300_000 });
    expect(clock.turn).toBe("b");
    expect(tick(clock, 13_000, true).remaining.b).toBe(297_000);
  });

  it("temps écoulé : le camp au trait tombe, l'appui ne change plus rien", () => {
    const clock = tick(start(), 300_000, true);
    expect(flagged(clock)).toBe("w");
    expect(remainingMs(clock, "w")).toBe(0);
    const pressed = press(clock, 300_500);
    expect(pressed.turn).toBe("w");
    expect(flagged(pressed)).toBe("w");
  });

  it("personne ne tombe tant qu'il reste du temps", () => {
    expect(flagged(tick(start(), 299_999, true))).toBeNull();
    expect(flagged(null)).toBeNull();
  });

  it("annuler l'appui (seconde chance) : temps de réflexion consommé, incrément retiré", () => {
    const pressed = press(start(), 10_000);
    const thinking = tick(pressed, 12_000, false);
    const undone = undoPress(thinking, 20_000);
    expect(undone.turn).toBe("w");
    expect(undone.remaining).toEqual({ w: 290_000, b: 300_000 });
    // Le décompte reprend à partir de l'annulation.
    expect(tick(undone, 21_000, true).remaining.w).toBe(289_000);
    // Rien à annuler deux fois.
    expect(undoPress(undone, 22_000)).toEqual(undone);
  });
});
