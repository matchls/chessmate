import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Mon profil — ChessMate" };

/** Page réservée aux comptes : la session est vérifiée côté serveur à chaque visite. */
export default function ProfilePage() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 py-12">
      <Suspense>
        <Profile />
      </Suspense>
    </main>
  );
}

async function Profile() {
  const user = await requireUser("/profil");
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{user.username}</CardTitle>
        <CardDescription>{user.email}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm">
        <p>
          Elo : <span className="font-semibold">{user.elo}</span>
        </p>
        <p className="text-muted-foreground">
          L&apos;historique de tes parties arrive bientôt.
        </p>
      </CardContent>
    </Card>
  );
}
