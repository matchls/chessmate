import { Chess, type Square } from "chess.js";
import { z } from "zod";

/**
 * Forme exacte des données qui entrent dans `/api/coach` et qui en sortent.
 * Le serveur ne fait jamais confiance au client : tout est revérifié ici.
 */

export const HINT_LEVELS = [1, 2, 3] as const;
export type HintLevel = (typeof HINT_LEVELS)[number];

const SQUARE = /^[a-h][1-8]$/;
const squareSchema = z.string().regex(SQUARE) as unknown as z.ZodType<Square>;

const isValidFen = (fen: string) => {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
};

const scoreSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cp"), value: z.number().int() }),
  z.object({ type: z.literal("mate"), value: z.number().int() }),
]);

const moveSchema = z.object({
  from: squareSchema,
  to: squareSchema,
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});

const analysisSchema = z.object({
  score: scoreSchema,
  bestMove: moveSchema.nullable(),
  pv: z.array(z.string().max(5)).max(30),
  depth: z.number().int().min(0).max(100),
});

export const coachRequestSchema = z.object({
  fen: z
    .string()
    .min(15)
    .max(100)
    .refine(isValidFen, "Position (FEN) invalide"),
  hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(1),
  question: z.string().trim().max(300).optional(),
  lastMove: z
    .object({
      san: z.string().max(10),
      moveClass: z
        .enum(["good", "inaccuracy", "mistake", "blunder"])
        .optional(),
    })
    .optional(),
  analysis: analysisSchema.optional(),
});

export type CoachRequest = z.infer<typeof coachRequestSchema>;

/** Rejoue un coup sur une position ; renvoie la position d'après, ou null si le coup est illégal. */
export function fenAfterMove(
  fen: string,
  move: { from: Square; to: Square; promotion?: string },
): string | null {
  try {
    const game = new Chess(fen);
    game.move(move);
    return game.fen();
  } catch {
    return null;
  }
}

export const EXPLAIN_STEPS = ["why", "solution"] as const;
export type ExplainStep = (typeof EXPLAIN_STEPS)[number];

/**
 * Demande d'explication d'un coup signalé (« Pourquoi ? », puis « Voir la solution »).
 * Le serveur revérifie que le coup joué et les meilleurs coups sont légaux dans leur position.
 */
export const explainRequestSchema = z
  .object({
    kind: z.literal("explain"),
    step: z.enum(EXPLAIN_STEPS),
    fenBefore: z
      .string()
      .min(15)
      .max(100)
      .refine(isValidFen, "Position (FEN) invalide"),
    played: moveSchema,
    moveClass: z.enum(["inaccuracy", "mistake", "blunder"]),
    /** Analyse de la position d'avant : son meilleur coup est la solution. */
    before: analysisSchema.extend({ bestMove: moveSchema }),
    /** Analyse de la position d'après : son meilleur coup est la réplique adverse. */
    after: analysisSchema.optional(),
  })
  .superRefine((request, context) => {
    const fenAfter = fenAfterMove(request.fenBefore, request.played);
    if (!fenAfter) {
      context.addIssue({ code: "custom", message: "Coup joué illégal" });
      return;
    }
    if (!fenAfterMove(request.fenBefore, request.before.bestMove)) {
      context.addIssue({ code: "custom", message: "Meilleur coup illégal" });
    }
    const reply = request.after?.bestMove;
    if (reply && !fenAfterMove(fenAfter, reply)) {
      context.addIssue({ code: "custom", message: "Réplique illégale" });
    }
  });

export type ExplainRequest = z.infer<typeof explainRequestSchema>;

/** Réponse à une demande d'explication. `board` : position sur laquelle portent les visuels. */
export type ExplainResponse = {
  message: string;
  highlights: Square[];
  arrows: CoachArrow[];
  step: ExplainStep;
  board: "before" | "after";
};

/** Ce que le modèle doit renvoyer (avant passage au garde-fou). */
export const modelReplySchema = z.object({
  message: z.string().trim().min(1).max(700),
  highlights: z.array(z.string()).max(12).default([]),
  arrows: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(6)
    .default([]),
});

export type ModelReply = z.infer<typeof modelReplySchema>;

export type CoachArrow = { from: Square; to: Square };

/** Réponse renvoyée au navigateur, après le garde-fou. */
export type CoachResponse = {
  message: string;
  highlights: Square[];
  arrows: CoachArrow[];
  hintLevel: HintLevel;
};

export function isSquare(value: string): value is Square {
  return SQUARE.test(value);
}
