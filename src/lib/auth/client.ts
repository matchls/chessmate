"use client";

import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Côté navigateur : appelle /api/auth (même site, donc pas d'adresse à configurer). */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});
