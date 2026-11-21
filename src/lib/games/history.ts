import type {
  GameOutcome,
  GameTermination,
  PlayerColor,
} from "@/generated/prisma/enums";

/** Une ligne de l'historique, prête à afficher. */
export type HistoryRow = {
  date: string;
  result: "Victoire" | "Défaite" | "Nulle";
  tone: "win" | "loss" | "draw";
  how: string;
  opponent: string;
  color: string;
  /** « +24 », « −10 », « 0 », ou « avec aide » quand la partie ne compte pas. */
  elo: string;
};

const HOW: Record<GameTermination, string> = {
  CHECKMATE: "par mat",
  RESIGNATION: "par abandon",
  STALEMATE: "pat",
  INSUFFICIENT_MATERIAL: "matériel insuffisant",
  THREEFOLD: "répétition",
  FIFTY_MOVES: "règle des 50 coups",
  TIMEOUT: "au temps",
};

export function historyRow(game: {
  playedAt: Date;
  outcome: GameOutcome;
  termination: GameTermination;
  playerColor: PlayerColor;
  botLevel: number | null;
  assisted: boolean;
  eloBefore: number | null;
  eloAfter: number | null;
}): HistoryRow {
  const won =
    (game.outcome === "WHITE_WINS" && game.playerColor === "WHITE") ||
    (game.outcome === "BLACK_WINS" && game.playerColor === "BLACK");
  const tone = game.outcome === "DRAW" ? "draw" : won ? "win" : "loss";
  const delta =
    game.eloBefore !== null && game.eloAfter !== null
      ? game.eloAfter - game.eloBefore
      : null;
  return {
    date: game.playedAt.toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
    }),
    result: tone === "win" ? "Victoire" : tone === "loss" ? "Défaite" : "Nulle",
    tone,
    how: HOW[game.termination],
    opponent: game.botLevel ? `Bot ${game.botLevel}` : "—",
    color: game.playerColor === "WHITE" ? "Blancs" : "Noirs",
    elo:
      delta === null
        ? game.assisted
          ? "avec aide"
          : "—"
        : delta > 0
          ? `+${delta}`
          : delta < 0
            ? `−${-delta}`
            : "0",
  };
}
