"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { SIGN_IN_PATH, SIGN_UP_PATH, safeReturnPath } from "@/lib/auth/paths";
import {
  authErrorMessage,
  fieldErrors,
  isEmail,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/validation";

type Errors = Record<string, string>;

/** Formulaire d'inscription (pseudo, e-mail, mot de passe) ou de connexion (e-mail ou pseudo). */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (signUp ? signUpSchema : signInSchema).safeParse(data);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);

    let error: { code?: string; status?: number } | null = null;
    if (signUp) {
      const input = signUpSchema.parse(data);
      ({ error } = await authClient.signUp.email({
        email: input.email,
        password: input.password,
        name: input.username,
        username: input.username,
      }));
    } else {
      const input = signInSchema.parse(data);
      ({ error } = isEmail(input.identifier)
        ? await authClient.signIn.email({
            email: input.identifier,
            password: input.password,
          })
        : await authClient.signIn.username({
            username: input.identifier,
            password: input.password,
          }));
    }

    setPending(false);
    if (error) {
      setErrors({ form: authErrorMessage(error) });
      return;
    }
    router.push(safeReturnPath(searchParams.get("retour")));
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{signUp ? "Créer un compte" : "Se connecter"}</CardTitle>
        <CardDescription>
          {signUp
            ? "Pour garder tes parties et suivre ton Elo. Sans compte, tu peux jouer quand même."
            : "Avec ton e-mail ou ton pseudo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {signUp ? (
            <>
              <Field label="Pseudo" name="username" error={errors.username}>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label="E-mail" name="email" error={errors.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
            </>
          ) : (
            <Field
              label="E-mail ou pseudo"
              name="identifier"
              error={errors.identifier}
            >
              <Input
                id="identifier"
                name="identifier"
                autoComplete="username"
                required
              />
            </Field>
          )}
          <Field label="Mot de passe" name="password" error={errors.password}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={signUp ? "new-password" : "current-password"}
              required
            />
          </Field>

          {errors.form && (
            <p role="alert" className="text-destructive text-sm">
              {errors.form}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending
              ? "Un instant…"
              : signUp
                ? "Créer mon compte"
                : "Se connecter"}
          </Button>

          <p className="text-muted-foreground text-sm">
            {signUp ? "Déjà un compte ? " : "Pas encore de compte ? "}
            <Link
              href={signUp ? SIGN_IN_PATH : SIGN_UP_PATH}
              className="text-foreground underline underline-offset-4"
            >
              {signUp ? "Se connecter" : "Créer un compte"}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error && (
        <p id={`${name}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
