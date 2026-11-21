import { z } from "zod";

/**
 * Règles des formulaires de compte. Appliquées à l'écran (messages immédiats) et
 * revérifiées par le serveur (Better Auth + plugin pseudo) : le serveur ne fait jamais
 * confiance au navigateur.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
/** Lettres sans accent, chiffres, tiret bas et point : lisible dans une URL et un classement. */
export const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(
    USERNAME_MIN,
    `Le pseudo doit faire au moins ${USERNAME_MIN} caractères.`,
  )
  .max(USERNAME_MAX, `Le pseudo doit faire au plus ${USERNAME_MAX} caractères.`)
  .regex(
    USERNAME_PATTERN,
    "Le pseudo ne peut contenir que des lettres sans accent, des chiffres, « _ » et « . ».",
  );

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Indique ton adresse e-mail.")
  .email("Cette adresse e-mail n'est pas valide.");

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN,
    `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`,
  )
  .max(128, "Le mot de passe est trop long.");

export const signUpSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/** Connexion avec l'e-mail ou le pseudo : un « @ » désigne une adresse e-mail. */
export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Indique ton e-mail ou ton pseudo."),
  password: z.string().min(1, "Indique ton mot de passe."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export function isEmail(identifier: string): boolean {
  return identifier.includes("@");
}

/** Premier message d'erreur par champ, pour l'afficher sous le champ concerné. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}

/** Messages français pour les codes d'erreur renvoyés par Better Auth. */
const AUTH_ERRORS: Record<string, string> = {
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Un compte existe déjà avec cette adresse e-mail.",
  USERNAME_IS_ALREADY_TAKEN: "Ce pseudo est déjà pris.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou mot de passe incorrect.",
  INVALID_USERNAME_OR_PASSWORD: "Pseudo ou mot de passe incorrect.",
  PASSWORD_TOO_SHORT: `Le mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`,
  INVALID_USERNAME: "Ce pseudo n'est pas valide.",
  USERNAME_TOO_SHORT: `Le pseudo doit faire au moins ${USERNAME_MIN} caractères.`,
  USERNAME_TOO_LONG: `Le pseudo doit faire au plus ${USERNAME_MAX} caractères.`,
};

export function authErrorMessage(
  error: { code?: string; status?: number } | null | undefined,
): string {
  if (error?.status === 429) {
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  }
  return (
    (error?.code && AUTH_ERRORS[error.code]) ??
    "Une erreur est survenue. Réessaie dans un instant."
  );
}
