import { describe, expect, it } from "vitest";
import {
  InvalidGameError,
  prepareGame,
  saveGameSchema,
  type SaveGameInput,
} from "./record";

const FOOLS_MATE = [
  { from: "f2", to: "f3" },
  { from: "e7", to: "e5" },
  { from: "g2", to: "g4" },
  { from: "d8", to: "h4" },
] as const;

const input = (patch: Partial<SaveGameInput> = {}): SaveGameInput =>
  saveGameSchema.parse({
    clientGameId: "6f0c1f9e-7a7b-4c6e-9d43-1f2a3b4c5d6e",
    moves: FOOLS_MATE,
    level: 800,
    side: "black",
    resigned: false,
    assisted: false,
    secondChancesUsed: 0,
    ...patch,
  });

const player = { elo: 600, countedGames: 0 };
const now = new Date("2026-11-21T15:00:00Z");

describe("fiche d'une partie terminée", () => {
  it("mat des noirs : victoire du joueur avec les noirs, Elo recalculé par le serveur", () => {
    const game = prepareGame(input(), player, now);
    expect(game).toMatchObject({
      playerColor: "BLACK",
      botLevel: 800,
      outcome: "BLACK_WINS",
      termination: "CHECKMATE",
      eloBefore: 600,
      eloAfter: 630,
    });
    expect(game.pgn).toContain('[White "Bot 800"]');
    expect(game.pgn).toContain('[Result "0-1"]');
    expect(game.pgn).toContain("Qh4#");
  });

  it("même partie, joueur avec les blancs : défaite", () => {
    const game = prepareGame(input({ side: "white" }), player, now);
    expect(game.outcome).toBe("BLACK_WINS");
    expect(game.eloAfter).toBe(590);
  });

  it("abandon : défaite du joueur, quelle que soit la position", () => {
    const game = prepareGame(
      input({
        moves: [{ from: "e2", to: "e4" }],
        side: "white",
        resigned: true,
      }),
      player,
      now,
    );
    expect(game).toMatchObject({
      outcome: "BLACK_WINS",
      termination: "RESIGNATION",
    });
    expect(game.eloAfter).toBeLessThan(600);
  });

  it("partie avec aide : enregistrée, mais ne compte pas pour l'Elo", () => {
    const game = prepareGame(
      input({ assisted: true, secondChancesUsed: 2 }),
      player,
      now,
    );
    expect(game).toMatchObject({
      assisted: true,
      secondChancesUsed: 2,
      eloBefore: null,
      eloAfter: null,
    });
  });

  it("refuse un coup illégal et une partie pas terminée", () => {
    expect(() =>
      prepareGame(input({ moves: [{ from: "e2", to: "e5" }] }), player, now),
    ).toThrow(InvalidGameError);
    expect(() =>
      prepareGame(input({ moves: [{ from: "e2", to: "e4" }] }), player, now),
    ).toThrow("La partie n'est pas terminée");
  });

  it("le schéma refuse un niveau inconnu et un identifiant mal formé", () => {
    const base = {
      clientGameId: "6f0c1f9e-7a7b-4c6e-9d43-1f2a3b4c5d6e",
      moves: FOOLS_MATE,
      level: 800,
      side: "black",
      resigned: false,
      assisted: false,
      secondChancesUsed: 0,
    };
    expect(saveGameSchema.safeParse(base).success).toBe(true);
    expect(saveGameSchema.safeParse({ ...base, level: 2800 }).success).toBe(
      false,
    );
    expect(
      saveGameSchema.safeParse({ ...base, clientGameId: "123" }).success,
    ).toBe(false);
  });
});
