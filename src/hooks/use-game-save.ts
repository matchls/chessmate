"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { postGame, saveNotice, type SaveOutcome } from "@/lib/games/client";
import type { SaveGameInput } from "@/lib/games/record";

export type GameSaveState =
  | { status: "guest" }
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

/**
 * En fin de partie, enregistre la partie du joueur connecté (une seule fois par partie),
 * puis rafraîchit la page pour mettre à jour l'Elo de l'en-tête. En invité : rien n'est envoyé.
 */
export function useGameSave({
  gameNumber,
  isOver,
  buildRequest,
}: {
  /** Change à chaque nouvelle partie. */
  gameNumber: number;
  isOver: boolean;
  /** Construit la demande ; reçoit l'identifiant unique de la partie. */
  buildRequest: (clientGameId: string) => SaveGameInput | null;
}): GameSaveState {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [outcome, setOutcome] = useState<{
    gameNumber: number;
    result: SaveOutcome | "saving";
  } | null>(null);
  // Identifiant tiré dans le navigateur au moment d'enregistrer (jamais pendant le rendu).
  const idsRef = useRef(new Map<number, string>());
  const requestRef = useRef(buildRequest);
  useEffect(() => {
    requestRef.current = buildRequest;
  });

  const loggedIn = !!session;
  const alreadySent = outcome?.gameNumber === gameNumber;
  useEffect(() => {
    if (!isOver || !loggedIn || alreadySent) return;
    let clientGameId = idsRef.current.get(gameNumber);
    if (!clientGameId) {
      clientGameId = crypto.randomUUID();
      idsRef.current.set(gameNumber, clientGameId);
    }
    const request = requestRef.current(clientGameId);
    if (!request) return;
    setOutcome({ gameNumber, result: "saving" });
    void postGame(request).then((result) => {
      setOutcome({ gameNumber, result });
      if (result.ok) router.refresh();
    });
  }, [isOver, loggedIn, alreadySent, gameNumber, router]);

  if (!isOver) return { status: "idle" };
  if (!isPending && !loggedIn) return { status: "guest" };
  if (!alreadySent || outcome.result === "saving") return { status: "saving" };
  return outcome.result.ok
    ? { status: "saved", message: saveNotice(outcome.result.result) }
    : { status: "error", message: outcome.result.message };
}
