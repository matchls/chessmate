import { extractFacts } from "@/lib/coach/facts";
import { guardReply, type GuardResult } from "@/lib/coach/guard";
import { buildMessages } from "@/lib/coach/prompt";
import type { LLMProvider } from "@/lib/coach/provider";
import type { CoachRequest } from "@/lib/coach/schema";

/**
 * Le trajet complet d'une demande au coach, sans rien de propre au serveur web :
 * faits de la position → messages → modèle → garde-fou.
 * Utilisé par la route `/api/coach` et par le banc d'essai.
 */
export async function askCoach(
  request: CoachRequest,
  provider: LLMProvider,
): Promise<GuardResult & { latencyMs: number }> {
  const facts = extractFacts({
    fen: request.fen,
    analysis: request.analysis,
    lastMove: request.lastMove,
  });
  const messages = buildMessages(facts, request.hintLevel, request.question);

  const started = performance.now();
  const raw = await provider.complete(messages);
  const latencyMs = Math.round(performance.now() - started);

  const result = guardReply(raw, {
    fen: request.fen,
    hintLevel: request.hintLevel,
    bestMove: request.analysis?.bestMove,
  });
  return { ...result, latencyMs };
}
