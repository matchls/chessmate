import { z } from "zod";
import type { MoveClass, PositionAnalysis } from "@/lib/engine/evaluation";
import type { MoveInput } from "@/lib/chess/game";
import {
  EXPLAIN_STEPS,
  HINT_LEVELS,
  isSquare,
  type coachRequestSchema,
  type CoachResponse,
  type explainRequestSchema,
  type ExplainResponse,
  type ExplainStep,
  type HintLevel,
} from "@/lib/coach/schema";

/**
 * Côté navigateur : prépare la demande au coach, l'envoie à `/api/coach` et vérifie la
 * réponse. Le navigateur ne fait pas plus confiance au serveur que l'inverse : une réponse
 * mal formée est traitée comme une erreur, jamais affichée telle quelle.
 */

export const COACH_ENDPOINT = "/api/coach";
export const QUESTION_MAX_LENGTH = 300;
/** Longueur maximale de la ligne principale envoyée (même limite que le serveur). */
const PV_MAX = 30;

export type CoachRequestInput = z.input<typeof coachRequestSchema>;

export type BuildRequestInput = {
  fen: string;
  hintLevel: HintLevel;
  analysis?: PositionAnalysis;
  lastMove?: { san: string; moveClass?: MoveClass };
  question?: string;
};

/** Assemble le corps de la demande ; une question vide n'est pas envoyée. */
export function buildCoachRequest({
  fen,
  hintLevel,
  analysis,
  lastMove,
  question,
}: BuildRequestInput): CoachRequestInput {
  const trimmed = question?.trim().slice(0, QUESTION_MAX_LENGTH);
  return {
    fen,
    hintLevel,
    ...(trimmed ? { question: trimmed } : {}),
    ...(lastMove ? { lastMove } : {}),
    ...(analysis
      ? {
          analysis: {
            score: analysis.score,
            bestMove: analysis.bestMove,
            pv: analysis.pv.slice(0, PV_MAX),
            depth: analysis.depth,
          },
        }
      : {}),
  };
}

const squareSchema = z.string().refine(isSquare);

const coachResponseSchema = z.object({
  message: z.string().min(1),
  highlights: z.array(squareSchema),
  arrows: z.array(z.object({ from: squareSchema, to: squareSchema })),
  hintLevel: z.union(HINT_LEVELS.map((level) => z.literal(level))),
});

export type CoachErrorKind =
  | "rate-limited"
  | "unavailable"
  | "invalid-request"
  | "invalid-response"
  | "network"
  | "aborted";

export type CoachOutcome =
  | { ok: true; response: CoachResponse }
  | { ok: false; kind: CoachErrorKind; message: string };

const MESSAGES: Record<Exclude<CoachErrorKind, "rate-limited">, string> = {
  unavailable:
    "Le coach n'est pas disponible pour le moment. La partie continue.",
  "invalid-request": "Le coach n'a pas compris la demande.",
  "invalid-response": "Le coach a répondu de travers. Réessaie.",
  network: "Impossible de joindre le coach. Vérifie ta connexion.",
  aborted: "Demande annulée.",
};

function rateLimitedMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Tu as beaucoup sollicité le coach. Réessaie dans quelques minutes.";
  }
  const minutes = Math.ceil(seconds / 60);
  return `Tu as beaucoup sollicité le coach. Réessaie dans ${minutes} min.`;
}

type RequestOptions = {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

/** Envoie une demande à `/api/coach` et vérifie la réponse avec le schéma donné. */
async function postToCoach<T>(
  body: unknown,
  schema: z.ZodType<T>,
  { fetchImpl = fetch, signal }: RequestOptions,
): Promise<
  | { ok: true; response: T }
  | { ok: false; kind: CoachErrorKind; message: string }
> {
  let response: Response;
  try {
    response = await fetchImpl(COACH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    const kind = signal?.aborted ? "aborted" : "network";
    return { ok: false, kind, message: MESSAGES[kind] };
  }

  if (response.status === 429) {
    return {
      ok: false,
      kind: "rate-limited",
      message: rateLimitedMessage(response.headers.get("Retry-After")),
    };
  }
  if (response.status === 400 || response.status === 413) {
    return {
      ok: false,
      kind: "invalid-request",
      message: MESSAGES["invalid-request"],
    };
  }
  if (!response.ok) {
    return { ok: false, kind: "unavailable", message: MESSAGES.unavailable };
  }

  const json: unknown = await response.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      kind: "invalid-response",
      message: MESSAGES["invalid-response"],
    };
  }
  return { ok: true, response: parsed.data };
}

export async function requestCoach(
  body: CoachRequestInput,
  options: RequestOptions = {},
): Promise<CoachOutcome> {
  const outcome = await postToCoach(body, coachResponseSchema, options);
  return outcome.ok
    ? { ok: true, response: outcome.response as CoachResponse }
    : outcome;
}

// --- Explication d'un coup signalé (« Pourquoi ? » puis « Voir la solution ») ---

export type ExplainRequestInput = z.input<typeof explainRequestSchema>;

export type BuildExplainInput = {
  step: ExplainStep;
  fenBefore: string;
  played: MoveInput;
  moveClass: Exclude<MoveClass, "good">;
  /** Analyses de la position d'avant (meilleur coup obligatoire) et d'après. */
  before: PositionAnalysis & { bestMove: MoveInput };
  after?: PositionAnalysis;
};

const trimAnalysis = <A extends PositionAnalysis>(analysis: A) => ({
  score: analysis.score,
  bestMove: analysis.bestMove,
  pv: analysis.pv.slice(0, PV_MAX),
  depth: analysis.depth,
});

export function buildExplainRequest({
  step,
  fenBefore,
  played,
  moveClass,
  before,
  after,
}: BuildExplainInput): ExplainRequestInput {
  return {
    kind: "explain",
    step,
    fenBefore,
    played: {
      from: played.from,
      to: played.to,
      ...(played.promotion ? { promotion: played.promotion } : {}),
    },
    moveClass,
    before: { ...trimAnalysis(before), bestMove: before.bestMove },
    ...(after ? { after: trimAnalysis(after) } : {}),
  };
}

const explainResponseSchema = z.object({
  message: z.string().min(1),
  highlights: z.array(squareSchema),
  arrows: z.array(z.object({ from: squareSchema, to: squareSchema })),
  step: z.enum(EXPLAIN_STEPS),
  board: z.enum(["before", "after"]),
});

export type ExplainOutcome =
  | { ok: true; response: ExplainResponse }
  | { ok: false; kind: CoachErrorKind; message: string };

export async function requestExplain(
  body: ExplainRequestInput,
  options: RequestOptions = {},
): Promise<ExplainOutcome> {
  const outcome = await postToCoach(body, explainResponseSchema, options);
  return outcome.ok
    ? { ok: true, response: outcome.response as ExplainResponse }
    : outcome;
}
