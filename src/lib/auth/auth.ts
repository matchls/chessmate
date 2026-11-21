import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins/username";
import { resolveBaseUrl, trustedOrigins } from "@/lib/auth/base-url";
import {
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from "@/lib/auth/validation";
import { getDb } from "@/lib/db";

/**
 * Configuration de Better Auth : comptes par e-mail + mot de passe (chiffré par Better Auth),
 * pseudo unique (connexion possible avec l'un ou l'autre), sessions en base, cookie httpOnly.
 * Créée à la première requête : la construction du site n'a pas besoin de la base.
 */
function createAuth() {
  return betterAuth({
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    baseURL: resolveBaseUrl(process.env),
    trustedOrigins: trustedOrigins(process.env),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        // Champs ChessMate : jamais saisis par le joueur (input: false).
        elo: {
          type: "number",
          required: false,
          defaultValue: 600,
          input: false,
        },
        theme: { type: "string", required: false, input: false },
      },
    },
    // Limite de tentatives (contre les essais de mots de passe en rafale), aussi en local.
    rateLimit: { enabled: true, window: 60, max: 20 },
    plugins: [
      username({
        minUsernameLength: USERNAME_MIN,
        maxUsernameLength: USERNAME_MAX,
        usernameValidator: (value) => USERNAME_PATTERN.test(value),
      }),
      // Doit rester le dernier : pose les cookies depuis les actions serveur de Next.js.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { chessmateAuth?: Auth };

export function getAuth(): Auth {
  globalForAuth.chessmateAuth ??= createAuth();
  return globalForAuth.chessmateAuth;
}
