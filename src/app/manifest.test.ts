import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifeste de l'application", () => {
  const app = manifest();

  it("s'installe en plein écran et s'ouvre sur la partie", () => {
    expect(app).toMatchObject({
      short_name: "ChessMate",
      start_url: "/jouer",
      display: "standalone",
      lang: "fr",
    });
  });

  it("déclare les icônes demandées par Android (192, 512, masquable), et elles existent", () => {
    const sizes = app.icons?.map((icon) => `${icon.sizes} ${icon.purpose}`);
    expect(sizes).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
    for (const icon of app.icons ?? []) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("icônes de l'onglet et de l'iPhone présentes", () => {
    for (const file of ["icon.svg", "apple-icon.png", "favicon.ico"]) {
      expect(existsSync(join(process.cwd(), "src/app", file))).toBe(true);
    }
  });
});
