import { extractFacts } from "@/lib/coach/facts";
import { guardReply, type GuardResult } from "@/lib/coach/guard";
import { templateHint } from "@/lib/coach/hints";
import { buildMessages } from "@/lib/coach/prompt";
import type { LLMProvider } from "@/lib/coach/provider";
import type { CoachRequest } from "@/lib/coach/schema";

export type CoachResult = GuardResult & {
  latencyMs: number;
  /** Qui a écrit la réponse : le code (gabarit) ou le modèle de langage. */
  source: "template" | "model";
};

/**
 * Le trajet complet d'une demande au coach, sans rien de propre au serveur web.
 * - Niveaux 1 et 2 sans question : indice écrit par le code (gabarit), sans appel au modèle.
 * - Niveau 3 ou question du joueur : faits → messages → modèle → garde-fou.
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

  if (request.hintLevel !== 3 && !request.question) {
    const hint = templateHint(request.fen, facts, request.hintLevel);
    return {
      ...hint,
      hintLevel: request.hintLevel,
      issues: [],
      latencyMs: 0,
      source: "template",
    };
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
