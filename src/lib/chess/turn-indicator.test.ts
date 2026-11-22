import { describe, expect, it } from "vitest";
import type { GameStatus } from "./game";
import { turnIndicator } from "./turn-indicator";

const playing = (turn: "w" | "b", check = false): GameStatus => ({
  kind: "playing",
  turn,
  check,
});

describe("indicateur de trait", () => {
  it("contre le bot : à toi de jouer, ou le bot réfléchit", () => {
    expect(turnIndicator({ status: playing("w"), playerColor: "w" })).toEqual({
      tone: "w",
      label: "À toi de jouer",
      detail: "Trait aux blancs",
      thinking: false,
      over: false,
    });
    expect(
      turnIndicator({ status: playing("b"), playerColor: "w" }),
    ).toMatchObject({ tone: "b", label: "Le bot réfléchit…", thinking: true });
  });

  it("le joueur qui a les noirs", () => {
    expect(
      turnIndicator({ status: playing("b"), playerColor: "b" }),
    ).toMatchObject({ tone: "b", label: "À toi de jouer" });
    expect(
      turnIndicator({ status: playing("w"), playerColor: "b" }),
    ).toMatchObject({ tone: "w", label: "Le bot réfléchit…" });
  });

  it("échec : annoncé en tête", () => {
    expect(
      turnIndicator({
        status: playing("w", true),
        playerColor: "w",
      }).label,
    ).toBe("Échec ! À toi de jouer");
  });

  it("seconde chance proposée : le bot attend, il ne réfléchit pas", () => {
    expect(
      turnIndicator({
        status: playing("b"),
        playerColor: "w",
        awaitingDecision: true,
      }),
    ).toMatchObject({
      label: "Décide : rejouer ou continuer",
      thinking: false,
    });
  });

  it("partie finie : le résultat, avec la couleur du gagnant (aucune pour une nulle)", () => {
    expect(
      turnIndicator({
        status: { kind: "checkmate", winner: "b" },
        playerColor: "w",
      }),
    ).toMatchObject({
      tone: "b",
      over: true,
      label: "Échec et mat : les noirs gagnent",
    });
    expect(
      turnIndicator({
        status: { kind: "resigned", winner: "w" },
        playerColor: "w",
      }),
    ).toMatchObject({
      tone: "w",
      over: true,
      label: "Les blancs gagnent par abandon",
    });
    expect(
      turnIndicator({
        status: { kind: "draw", reason: "stalemate" },
        playerColor: "w",
      }),
    ).toMatchObject({ tone: null, over: true });
    expect(
      turnIndicator({
        status: { kind: "timeout", winner: null },
        playerColor: "w",
      }),
    ).toMatchObject({ tone: null, over: true });
  });
});
