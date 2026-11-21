import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  fieldErrors,
  isEmail,
  signInSchema,
  signUpSchema,
} from "./validation";

const valid = {
  username: "mat_75",
  email: "mat@example.com",
  password: "motdepasse",
};

describe("formulaire d'inscription", () => {
  it("accepte un pseudo, un e-mail et un mot de passe valides", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["ab", "au moins 3"],
    ["a".repeat(21), "au plus 20"],
    ["mathéo", "lettres sans accent"],
    ["mat 75", "lettres sans accent"],
  ])("refuse le pseudo « %s »", (username, message) => {
    const result = signUpSchema.safeParse({ ...valid, username });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(fieldErrors(result.error).username).toContain(message);
  });

  it("refuse un e-mail invalide et un mot de passe trop court", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      email: "mat@",
      password: "court",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBe("Cette adresse e-mail n'est pas valide.");
      expect(errors.password).toContain("au moins 8");
    }
  });
});

describe("formulaire de connexion", () => {
  it("e-mail ou pseudo : un « @ » désigne une adresse", () => {
    expect(isEmail("mat@example.com")).toBe(true);
    expect(isEmail("mat_75")).toBe(false);
  });

  it("refuse des champs vides", () => {
    const result = signInSchema.safeParse({ identifier: " ", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toEqual({
        identifier: "Indique ton e-mail ou ton pseudo.",
        password: "Indique ton mot de passe.",
      });
    }
  });
});

describe("messages d'erreur du serveur", () => {
  it("traduit les codes de Better Auth", () => {
    expect(authErrorMessage({ code: "USERNAME_IS_ALREADY_TAKEN" })).toBe(
      "Ce pseudo est déjà pris.",
    );
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(
      "E-mail ou mot de passe incorrect.",
    );
    expect(authErrorMessage({ status: 429 })).toContain("Trop de tentatives");
    expect(authErrorMessage({ code: "INCONNU" })).toContain(
      "Une erreur est survenue",
    );
  });
});
