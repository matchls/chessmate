import { describe, expect, it } from "vitest";
import { buildSaveRequest, postGame, saveNotice } from "./client";
import { saveGameSchema } from "./record";

describe("enregistrement côté navigateur", () => {
  const body = buildSaveRequest({
    clientGameId: "6f0c1f9e-7a7b-4c6e-9d43-1f2a3b4c5d6e",
    moves: [
      { from: "e2", to: "e4" },
      { from: "e7", to: "e8", promotion: "q" },
    ],
    settings: { level: 1000, side: "white", timeControl: "none" },
    resigned: true,
    assisted: false,
    secondChancesUsed: 0,
  });

  it("produit une demande acceptée par le schéma du serveur", () => {
    expect(saveGameSchema.safeParse(body).success).toBe(true);
    expect(body.moves[0]).toEqual({ from: "e2", to: "e4" });
  });

  it("message de fin : variation d'Elo, ou partie avec aide", () => {
    expect(
      saveNotice({
        created: true,
        counted: true,
        eloBefore: 600,
        eloAfter: 624,
      }),
    ).toBe("Partie enregistrée · Elo 600 → 624 (+24)");
    expect(
      saveNotice({
        created: true,
        counted: true,
        eloBefore: 600,
        eloAfter: 590,
      }),
    ).toBe("Partie enregistrée · Elo 600 → 590 (−10)");
    expect(
      saveNotice({
        created: true,
        counted: false,
        eloBefore: null,
        eloAfter: null,
      }),
    ).toContain("ne compte pas pour l'Elo");
  });

  it("erreur du serveur ou du réseau : message, pas de plantage", async () => {
    const failing = (async () =>
      new Response("{}", { status: 500 })) as typeof fetch;
    await expect(postGame(body, failing)).resolves.toMatchObject({ ok: false });
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(postGame(body, offline)).resolves.toMatchObject({ ok: false });
  });
});
