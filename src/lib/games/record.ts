import { z } from "zod";
import {
  getStatus,
  replay,
  type Color,
  type DrawReason,
} from "@/lib/chess/game";
import { eloAfterGame } from "@/lib/elo";
import { BOT_LEVELS, type BotLevelId } from "@/lib/engine/levels";
import { isSquare } from "@/lib/coach/schema";
import { pgnTimeControl, TIME_CONTROL_IDS } from "@/lib/chess/time-controls";
import type {
  GameOutcome,
  GameTermination,
  PlayerColor,
} from "@/generated/prisma/enums";

/**
 * Enregistrement d'une partie terminée. Le navigateur envoie les coups et les réglages ; le
 * serveur ne le croit pas sur parole : il rejoue la partie (coups légaux), recalcule la fin
 * (mat, nulle) et l'Elo à partir de l'Elo stocké en base.
 */

const squareSchema = z.string().refine(isSquare, "Case invalide");
const LEVEL_IDS = BOT_LEVELS.map((level) => level.id);

export const saveGameSchema = z
  .object({
    /** Identifiant tiré au lancement de la partie : empêche un double enregistrement. */
    clientGameId: z.uuid(),
    moves: z
      .array(
        z.object({
          from: squareSchema,
          to: squareSchema,
          promotion: z.enum(["q", "r", "b", "n"]).optional(),
        }),
      )
      .min(1)
      .max(600),
    level: z
      .number()
      .refine(
        (value) => LEVEL_IDS.includes(value as BotLevelId),
        "Niveau inconnu",
      ),
    side: z.enum(["white", "black"]),
    resigned: z.boolean(),
    assisted: z.boolean(),
    secondChancesUsed: z.number().int().min(0).max(10),
    timeControl: z.enum(TIME_CONTROL_IDS).default("none"),
    /** Le camp au trait est tombé au temps (le serveur en déduit lequel). */
    timedOut: z.boolean().default(false),
  })
  .refine((input) => !(input.timedOut && input.timeControl === "none"), {
    message: "Temps écoulé impossible sans pendule",
  })
  .refine((input) => !(input.timedOut && input.resigned), {
    message: "Abandon et temps écoulé à la fois",
  });

export type SaveGameInput = z.infer<typeof saveGameSchema>;

export type PreparedGame = {
  pgn: string;
  playerColor: PlayerColor;
  botLevel: number;
  outcome: GameOutcome;
  termination: GameTermination;
  assisted: boolean;
  secondChancesUsed: number;
  /** Null : la partie ne compte pas pour l'Elo (partie « avec aide »). */
  eloBefore: number | null;
  eloAfter: number | null;
};

export class InvalidGameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGameError";
  }
}

const DRAW_TERMINATION: Record<DrawReason, GameTermination> = {
  stalemate: "STALEMATE",
  "insufficient-material": "INSUFFICIENT_MATERIAL",
  threefold: "THREEFOLD",
  "fifty-moves": "FIFTY_MOVES",
};

const OUTCOME_OF: Record<Color, GameOutcome> = {
  w: "WHITE_WINS",
  b: "BLACK_WINS",
};

/**
 * Prépare la fiche à enregistrer. `countedGames` : parties déjà comptées pour l'Elo.
 * Lève InvalidGameError si un coup est illégal ou si la partie n'est pas terminée.
 */
export function prepareGame(
  input: SaveGameInput,
  player: { elo: number; countedGames: number },
  now: Date = new Date(),
): PreparedGame {
  let game;
  try {
    game = replay(input.moves);
  } catch {
    throw new InvalidGameError("Coup illégal dans la partie");
  }

  const playerColor: Color = input.side === "white" ? "w" : "b";
  // Temps écoulé : c'est forcément le camp au trait qui est tombé (sa pendule tournait).
  const status = getStatus(
    game,
    input.resigned ? playerColor : null,
    input.timedOut ? game.turn() : null,
  );
  if (status.kind === "playing") {
    throw new InvalidGameError("La partie n'est pas terminée");
  }

  const winner = status.kind === "draw" ? null : status.winner;
  const outcome: GameOutcome = winner === null ? "DRAW" : OUTCOME_OF[winner];
  const termination: GameTermination =
    status.kind === "draw"
      ? DRAW_TERMINATION[status.reason]
      : status.kind === "checkmate"
        ? "CHECKMATE"
        : status.kind === "timeout"
          ? "TIMEOUT"
          : "RESIGNATION";
  const score: 0 | 0.5 | 1 =
    winner === null ? 0.5 : winner === playerColor ? 1 : 0;

  const result =
    outcome === "DRAW" ? "1/2-1/2" : outcome === "WHITE_WINS" ? "1-0" : "0-1";
  const bot = `Bot ${input.level}`;
  game.setHeader("Event", "Partie ChessMate");
  game.setHeader("Site", "ChessMate");
  game.setHeader("Date", now.toISOString().slice(0, 10).replaceAll("-", "."));
  game.setHeader("White", input.side === "white" ? "Joueur" : bot);
  game.setHeader("Black", input.side === "black" ? "Joueur" : bot);
  game.setHeader("Result", result);
  game.setHeader("TimeControl", pgnTimeControl(input.timeControl));
  if (status.kind === "resigned") game.setHeader("Termination", "abandon");
  if (status.kind === "timeout") game.setHeader("Termination", "temps écoulé");

  const elo = input.assisted
    ? null
    : eloAfterGame({
        rating: player.elo,
        opponent: input.level,
        score,
        countedGames: player.countedGames,
      });

  return {
    pgn: game.pgn(),
    playerColor: input.side === "white" ? "WHITE" : "BLACK",
    botLevel: input.level,
    outcome,
    termination,
    assisted: input.assisted,
    secondChancesUsed: input.secondChancesUsed,
    eloBefore: elo?.before ?? null,
    eloAfter: elo?.after ?? null,
  };
}
