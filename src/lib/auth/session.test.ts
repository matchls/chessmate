import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));
vi.mock("@/lib/auth/auth", () => ({
  getAuth: () => ({ api: { getSession } }),
}));

const { requireUser, getCurrentUser, toCurrentUser } =
  await import("./session");
const { safeReturnPath, signInRedirect } = await import("./paths");

const session = {
  user: {
    id: "u1",
    email: "mat@example.com",
    name: "mat_75",
    username: "mat_75",
    displayUsername: "Mat_75",
    elo: 640,
  },
};

describe("session côté serveur", () => {
  beforeEach(() => {
    getSession.mockReset();
    process.env.DATABASE_URL = "postgresql://test";
  });

  it("page réservée sans session : redirection vers la connexion, avec retour", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireUser("/profil")).rejects.toThrow(
      "REDIRECT /connexion?retour=%2Fprofil",
    );
  });

  it("page réservée avec session : le joueur", async () => {
    getSession.mockResolvedValue(session);
    await expect(requireUser("/profil")).resolves.toEqual({
      id: "u1",
      email: "mat@example.com",
      username: "Mat_75",
      elo: 640,
    });
  });

  it("base non configurée : invité, sans appeler Better Auth", async () => {
    delete process.env.DATABASE_URL;
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("valeurs par défaut : pseudo = nom, Elo 600", () => {
    expect(
      toCurrentUser({ user: { id: "u2", email: "a@b.c", name: "ana" } }),
    ).toEqual({ id: "u2", email: "a@b.c", username: "ana", elo: 600 });
  });
});

describe("retour après connexion", () => {
  it("seulement vers une page du site", () => {
    expect(safeReturnPath("/profil")).toBe("/profil");
    expect(safeReturnPath(null)).toBe("/jouer");
    expect(safeReturnPath("https://pirate.example")).toBe("/jouer");
    expect(safeReturnPath("//pirate.example")).toBe("/jouer");
    expect(safeReturnPath("/\\pirate.example")).toBe("/jouer");
    // Le navigateur supprime tabulations et retours à la ligne : « /\t/x » deviendrait « //x ».
    expect(safeReturnPath("/\t/pirate.example")).toBe("/jouer");
    expect(safeReturnPath("/\n/pirate.example")).toBe("/jouer");
    expect(safeReturnPath("/profil?onglet=parties")).toBe(
      "/profil?onglet=parties",
    );
    expect(signInRedirect("/profil")).toBe("/connexion?retour=%2Fprofil");
  });
});
