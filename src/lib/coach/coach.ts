import {
  EXPLAIN_FALLBACK,
  explainSolution,
  explainWhy,
  extractMistakeFacts,
  mistakeFactsToPrompt,
} from "@/lib/coach/explain";
import { extractFacts } from "@/lib/coach/facts";
import {
  guardReply,
  messageLeaksMove,
  type GuardResult,
} from "@/lib/coach/guard";
import { templateHint, templateIdea } from "@/lib/coach/hints";
import { buildExplainMessages, buildMessages } from "@/lib/coach/prompt";
import type { LLMProvider } from "@/lib/coach/provider";
import type {
  CoachRequest,
  ExplainRequest,
  ExplainResponse,
} from "@/lib/coach/schema";

export type CoachResult = GuardResult & {
  latencyMs: number;
  /** Qui a écrit la réponse : le code (gabarit) ou le modèle de langage. */
  source: "template" | "model";
};

/**
 * Le trajet complet d'une demande au coach, sans rien de propre au serveur web.
 * - Sans question : indice écrit par le code (gabarit), sans appel au modèle ; au niveau 3,
 *   seulement si le thème est reconnu.
 * - Niveau 3 sans thème reconnu, ou question du joueur : faits → messages → modèle → garde-fou.
 * Le fournisseur n'est créé que s'il sert : les gabarits marchent même sans clé d'API.
 * Utilisé par la route `/api/coach` et par le banc d'essai.
 */
export async function askCoach(
  request: CoachRequest,
  getProvider: () => LLMProvider,
): Promise<CoachResult> {
  const facts = extractFacts({
    fen: request.fen,
    analysis: request.analysis,
    lastMove: request.lastMove,
  });

  if (!request.question) {
    const hint =
      request.hintLevel === 3
        ? templateIdea(facts)
        : templateHint(request.fen, facts, request.hintLevel);
    if (hint) {
      return {
        ...hint,
        hintLevel: request.hintLevel,
        issues: [],
        latencyMs: 0,
        source: "template",
      };
    }
  }

  const provider = getProvider();
  const messages = buildMessages(facts, request.hintLevel, request.question);
  const started = performance.now();
  const raw = await provider.complete(messages);
  const latencyMs = Math.round(performance.now() - started);

  const result = guardReply(raw, {
    fen: request.fen,
    hintLevel: request.hintLevel,
    bestMove: request.analysis?.bestMove,
  });
  return { ...result, latencyMs, source: "model" };
}

export type ExplainResult = ExplainResponse & {
  issues: GuardResult["issues"];
  latencyMs: number;
  source: "template" | "model";
};

const FAILED: ReadonlySet<string> = new Set([
  "invalid-json",
  "invalid-shape",
  "leak-message",
]);

/**
 * Explication d'un coup signalé.
 * - « why » : visuels sur la position d'après (la réplique adverse est montrée) ; jamais le
 *   meilleur coup : le garde-fou le bloque comme pour un indice.
 * - « solution » : visuels sur la position d'avant ; la flèche du meilleur coup vient toujours
 *   de Stockfish, jamais du modèle (exception au garde-fou réservée à cette étape).
 */
export async function askExplain(
  request: ExplainRequest,
  getProvider: () => LLMProvider,
): Promise<ExplainResult> {
  const facts = extractMistakeFacts(request);
  const { step } = request;
  const board = step === "why" ? "after" : "before";
  const solutionArrow = [{ from: facts.best.from, to: facts.best.to }];

  const template = step === "why" ? explainWhy(facts) : explainSolution(facts);
  // Ceinture et bretelles : même un texte écrit par le code ne doit pas révéler la solution.
  const leaks =
    step === "why" &&
    template !== null &&
    messageLeaksMove(
      template.message,
      facts.fenBefore,
      request.before.bestMove,
    );
  if (template && !leaks) {
    return {
      ...template,
      step,
      board,
      issues: [],
      latencyMs: 0,
      source: "template",
    };
  }

  const provider = getProvider();
  const messages = buildExplainMessages(
    mistakeFactsToPrompt(facts, step),
    step,
  );
  const started = performance.now();
  const raw = await provider.complete(messages);
  const latencyMs = Math.round(performance.now() - started);

  // Le garde-fou relit la réponse dans la position d'avant, où se joue le meilleur coup :
  // à l'étape « why », il le bloque comme pour un indice (texte et cases).
  const guarded = guardReply(raw, {
    fen: facts.fenBefore,
    hintLevel: 3,
    bestMove: step === "why" ? request.before.bestMove : undefined,
  });
  const failed = guarded.issues.some((issue) => FAILED.has(issue));
  const message = failed
    ? step === "why"
      ? EXPLAIN_FALLBACK.why
      : EXPLAIN_FALLBACK.solution(facts)
    : guarded.message;

  return {
    message,
    highlights: failed ? [] : guarded.highlights.slice(0, 2),
    // Flèches : jamais celles du modèle. Réplique adverse (étape 1) ou solution (étape 2).
    arrows:
      step === "why"
        ? facts.refutation
          ? [{ from: facts.refutation.from, to: facts.refutation.to }]
          : []
        : solutionArrow,
    step,
    board,
    issues: guarded.issues,
    latencyMs,
    source: "model",
  };
}
