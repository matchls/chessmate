import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { buttonVariants } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";

/** Coin de l'en-tête : « Se connecter » en invité, sinon pseudo, Elo et déconnexion. */
export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link
        href={SIGN_IN_PATH}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Se connecter
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/profil" className="text-sm hover:underline">
        <span className="font-medium">{user.username}</span>
        <span className="text-muted-foreground"> · Elo {user.elo}</span>
      </Link>
      <SignOutButton />
    </div>
  );
}
