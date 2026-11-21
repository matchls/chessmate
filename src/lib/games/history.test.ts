import { describe, expect, it } from "vitest";
import { historyRow } from "./history";

const base = {
  playedAt: new Date("2026-11-21T15:00:00Z"),
  outcome: "BLACK_WINS" as const,
  termination: "CHECKMATE" as const,
  playerColor: "BLACK" as const,
  botLevel: 800,
  assisted: false,
  eloBefore: 600,
  eloAfter: 630,
};

describe("ligne de l'historique", () => {
  it("victoire par mat avec les noirs, +30", () => {
    expect(historyRow(base)).toEqual({
      date: "21/11/2026",
      result: "Victoire",
      tone: "win",
      how: "par mat",
      opponent: "Bot 800",
      color: "Noirs",
      elo: "+30",
    });
  });

  it("défaite par abandon avec les blancs, −10", () => {
    expect(
      historyRow({
        ...base,
        playerColor: "WHITE",
        termination: "RESIGNATION",
        eloAfter: 590,
      }),
    ).toMatchObject({ result: "Défaite", how: "par abandon", elo: "−10" });
  });

  it("nulle par pat ; partie avec aide sans Elo", () => {
    expect(
      historyRow({
        ...base,
        outcome: "DRAW",
        termination: "STALEMATE",
        eloAfter: 600,
      }),
    ).toMatchObject({ result: "Nulle", tone: "draw", how: "pat", elo: "0" });
    expect(
      historyRow({ ...base, assisted: true, eloBefore: null, eloAfter: null })
        .elo,
    ).toBe("avec aide");
  });
});
