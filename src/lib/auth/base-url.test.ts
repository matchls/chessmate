import { describe, expect, it } from "vitest";
import { resolveBaseUrl, trustedOrigins } from "./base-url";

describe("adresse du site (cookies de session)", () => {
  it("BETTER_AUTH_URL l'emporte", () => {
    expect(
      resolveBaseUrl({
        BETTER_AUTH_URL: "https://chessmate-tau.vercel.app",
        VERCEL_URL: "x.vercel.app",
      }),
    ).toBe("https://chessmate-tau.vercel.app");
  });

  it("production Vercel : l'adresse de production", () => {
    expect(
      resolveBaseUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "chessmate-tau.vercel.app",
        VERCEL_URL: "chessmate-abc.vercel.app",
      }),
    ).toBe("https://chessmate-tau.vercel.app");
  });

  it("aperçu : l'adresse du déploiement, et celle de la branche acceptée aussi", () => {
    const env = {
      VERCEL_ENV: "preview",
      VERCEL_URL: "chessmate-abc.vercel.app",
      VERCEL_BRANCH_URL: "chessmate-git-feat-11.vercel.app",
    };
    expect(resolveBaseUrl(env)).toBe("https://chessmate-abc.vercel.app");
    expect(trustedOrigins(env)).toEqual([
      "https://chessmate-abc.vercel.app",
      "https://chessmate-git-feat-11.vercel.app",
    ]);
  });

  it("en local : localhost:3000", () => {
    expect(resolveBaseUrl({})).toBe("http://localhost:3000");
  });
});
