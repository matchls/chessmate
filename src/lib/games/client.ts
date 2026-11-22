import type { MoveInput } from "@/lib/chess/game";
import type { GameSettings } from "@/lib/chess/game-settings";
import type { SaveGameInput } from "@/lib/games/record";
import type { SaveResult } from "@/lib/games/save";

/** Côté navigateur : envoie la partie terminée au serveur, qui la vérifie et l'enregistre. */

export function buildSaveRequest({
  clientGameId,
  moves,
  settings,
  resigned,
  timedOut = false,
  assisted,
  secondChancesUsed,
}: {
  clientGameId: string;
  moves: readonly MoveInput[];
  settings: GameSettings;
  resigned: boolean;
  timedOut?: boolean;
  assisted: boolean;
  secondChancesUsed: number;
}): SaveGameInput {
  return {
    clientGameId,
    moves: moves.map(({ from, to, promotion }) => ({
      from,
      to,
      ...(promotion ? { promotion } : {}),
    })),
    level: settings.level,
    side: settings.side,
    resigned,
    assisted,
    secondChancesUsed,
    timeControl: settings.timeControl,
    timedOut,
  };
}

export type SaveOutcome =
  { ok: true; result: SaveResult } | { ok: false; message: string };

export async function postGame(
  body: SaveGameInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SaveOutcome> {
  try {
    const response = await fetchImpl("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { ok: false, message: "La partie n'a pas pu être enregistrée." };
    }
    return { ok: true, result: (await response.json()) as SaveResult };
  } catch {
    return {
      ok: false,
      message: "La partie n'a pas pu être enregistrée (réseau).",
    };
  }
}

/** Message affiché en fin de partie pour un joueur connecté. */
export function saveNotice(result: SaveResult): string {
  if (
    !result.counted ||
    result.eloBefore === null ||
    result.eloAfter === null
  ) {
    return "Partie enregistrée. Avec aide : elle ne compte pas pour l'Elo.";
  }
  const delta = result.eloAfter - result.eloBefore;
  const sign = delta > 0 ? `+${delta}` : delta < 0 ? `−${-delta}` : "0";
  return `Partie enregistrée · Elo ${result.eloBefore} → ${result.eloAfter} (${sign})`;
}
