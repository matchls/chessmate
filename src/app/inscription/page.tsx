import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Créer un compte — ChessMate" };

export default function SignUpPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4 py-12">
      <Suspense>
        <AuthForm mode="sign-up" />
      </Suspense>
    </main>
  );
}
