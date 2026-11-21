import { describe, expect, it } from "vitest";
import { createDb, DatabaseNotConfiguredError } from "./db";

describe("accès à la base", () => {
  it("sans DATABASE_URL : erreur explicite, aucune connexion tentée", () => {
    expect(() => createDb(undefined)).toThrow(DatabaseNotConfiguredError);
    expect(() => createDb("")).toThrow(/DATABASE_URL absente/);
  });

  it("avec une adresse : client créé sans se connecter (connexion paresseuse)", async () => {
    const db = createDb("postgresql://user:pass@localhost:5432/chessmate");
    expect(typeof db.game.findMany).toBe("function");
    await db.$disconnect();
  });
});
