import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { saveGameSchema } from "./record";
import { saveGame } from "./save";

type StoredGame = {
  clientGameId: string;
  userId: string;
  eloBefore: number | null;
  eloAfter: number | null;
};

/** Fausse base en mémoire : juste ce que saveGame utilise. */
function fakeDb(elo = 600) {
  const games: StoredGame[] = [];
  const users = new Map([
    ["u1", { elo }],
    ["u2", { elo }],
  ]);
  const tx = {
    game: {
      findUnique: async ({ where }: { where: { clientGameId: string } }) =>
        games.find((game) => game.clientGameId === where.clientGameId) ?? null,
      count: async ({ where }: { where: { userId: string } }) =>
        games.filter(
          (game) => game.userId === where.userId && game.eloAfter !== null,
        ).length,
      create: async ({ data }: { data: StoredGame }) => {
        games.push(data);
        return data;
      },
    },
    user: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) =>
        users.get(where.id)!,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { elo: number };
      }) => {
        users.set(where.id, data);
      },
    },
  };
  const db = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
  return { db: db as unknown as PrismaClient, games, users };
}

const input = (patch: Record<string, unknown> = {}) =>
  saveGameSchema.parse({
    clientGameId: "6f0c1f9e-7a7b-4c6e-9d43-1f2a3b4c5d6e",
    moves: [
      { from: "f2", to: "f3" },
      { from: "e7", to: "e5" },
      { from: "g2", to: "g4" },
      { from: "d8", to: "h4" },
    ],
    level: 800,
    side: "black",
    resigned: false,
    assisted: false,
    secondChancesUsed: 0,
    ...patch,
  });

describe("enregistrement d'une partie", () => {
  it("enregistre la partie et met à jour l'Elo du joueur", async () => {
    const { db, games, users } = fakeDb();
    await expect(saveGame(db, "u1", input())).resolves.toEqual({
      created: true,
      counted: true,
      eloBefore: 600,
      eloAfter: 630,
    });
    expect(games).toHaveLength(1);
    expect(users.get("u1")?.elo).toBe(630);
  });

  it("double envoi de la même partie : pas de second enregistrement ni de double Elo", async () => {
    const { db, games, users } = fakeDb();
    await saveGame(db, "u1", input());
    await expect(saveGame(db, "u1", input())).resolves.toMatchObject({
      created: false,
      eloAfter: 630,
    });
    expect(games).toHaveLength(1);
    expect(users.get("u1")?.elo).toBe(630);
  });

  it("partie avec aide : enregistrée, Elo inchangé", async () => {
    const { db, games, users } = fakeDb();
    await expect(
      saveGame(db, "u1", input({ assisted: true, secondChancesUsed: 1 })),
    ).resolves.toMatchObject({ created: true, counted: false, eloAfter: null });
    expect(games).toHaveLength(1);
    expect(users.get("u1")?.elo).toBe(600);
  });

  it("identifiant déjà utilisé par un autre joueur : refusé", async () => {
    const { db } = fakeDb();
    await saveGame(db, "u1", input());
    await expect(saveGame(db, "u2", input())).rejects.toThrow("déjà utilisé");
  });
});
