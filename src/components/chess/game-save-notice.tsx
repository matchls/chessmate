import Link from "next/link";
import type { GameSaveState } from "@/hooks/use-game-save";
import { SIGN_UP_PATH } from "@/lib/auth/paths";

/** Message de fin de partie : partie enregistrée et variation d'Elo, ou invitation à créer un compte. */
export function GameSaveNotice({ state }: { state: GameSaveState }) {
  if (state.status === "idle") return null;
  return (
    <p aria-live="polite" className="text-sm">
      {state.status === "guest" && (
        <>
          <Link href={SIGN_UP_PATH} className="underline underline-offset-4">
            Crée un compte
          </Link>{" "}
          <span className="text-muted-foreground">
            pour garder tes parties et suivre ton Elo.
          </span>
        </>
      )}
      {state.status === "saving" && (
        <span className="text-muted-foreground">
          Enregistrement de la partie…
        </span>
      )}
      {state.status === "saved" && (
        <>
          {state.message}{" "}
          <Link href="/historique" className="underline underline-offset-4">
            Historique
          </Link>
        </>
      )}
      {state.status === "error" && (
        <span className="text-destructive">{state.message}</span>
      )}
    </p>
  );
}
