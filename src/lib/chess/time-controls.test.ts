import { describe, expect, it } from "vitest";
import {
  BOT_THINK_MAX_MS,
  BOT_THINK_MIN_MS,
  botThinkMs,
  formatClock,
  getTimeControl,
  pgnTimeControl,
} from "./time-controls";

describe("cadences", () => {
  it("5+2 : 5 minutes et 2 secondes par coup", () => {
    expect(getTimeControl("5+2")).toMatchObject({
      baseMs: 300_000,
      incrementMs: 2000,
    });
    expect(getTimeControl("none").baseMs).toBeNull();
  });

  it("format PGN", () => {
    expect(pgnTimeControl("15+10")).toBe("900+10");
    expect(pgnTimeControl("none")).toBe("-");
  });
});

describe("temps de réflexion du bot", () => {
  const middle = () => 0.5;

  it("environ 1/40 du temps restant + la moitié de l'incrément", () => {
    // 5 min restantes, +2 s : 7,5 s + 1 s.
    expect(botThinkMs(300_000, 2000, middle)).toBe(8500);
  });

  it("borné entre 0,5 et 10 secondes", () => {
    expect(botThinkMs(900_000, 10_000, () => 1)).toBe(BOT_THINK_MAX_MS);
    expect(botThinkMs(10_000, 0, () => 0)).toBe(BOT_THINK_MIN_MS);
  });

  it("jamais plus de la moitié du temps restant", () => {
    expect(botThinkMs(600, 0, middle)).toBe(300);
  });

  it("un peu de hasard autour de la valeur de base", () => {
    const low = botThinkMs(120_000, 0, () => 0);
    const high = botThinkMs(120_000, 0, () => 1);
    expect(low).toBeLessThan(high);
  });
});

describe("affichage", () => {
  it("minutes:secondes au-dessus de 10 s", () => {
    expect(formatClock(300_000)).toBe("5:00");
    expect(formatClock(65_400)).toBe("1:05");
    expect(formatClock(10_000)).toBe("0:10");
  });

  it("dixièmes sous 10 s, jamais négatif", () => {
    expect(formatClock(9_480)).toBe("9.4");
    expect(formatClock(0)).toBe("0.0");
    expect(formatClock(-500)).toBe("0.0");
  });
});
