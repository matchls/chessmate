import { askCoach } from "@/lib/coach/coach";
import {
  createProvider,
  ProviderError,
  ProviderNotConfiguredError,
} from "@/lib/coach/provider";
import { COACH_RATE_LIMIT, createRateLimiter } from "@/lib/coach/rate-limit";
import { coachRequestSchema, type CoachResponse } from "@/lib/coach/schema";

/**
 * POST /api/coach : demande un indice au coach.
 * Trajet : limite de requêtes → vérification de l'entrée → faits → modèle → garde-fou.
 * Les clés d'API restent ici, côté serveur ; le navigateur ne les voit jamais.
 */

const rateLimit = createRateLimiter(COACH_RATE_LIMIT);
const MAX_BODY_BYTES = 10_000;

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "inconnu"
  );
}

function error(status: number, message: string, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request));
  if (!limit.allowed) {
    return error(
      429,
      "Trop de demandes au coach. Réessaie dans quelques minutes.",
      {
        "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
      },
    );
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return error(413, "Demande trop volumineuse.");

  const body: unknown = await request.json().catch(() => null);
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return error(400, "Demande invalide.");

  try {
    const provider = createProvider();
    const { issues, latencyMs, ...reply } = await askCoach(
      parsed.data,
      provider,
    );
    if (issues.length > 0) {
      console.warn("[coach] garde-fou", {
        issues,
        model: provider.model,
        latencyMs,
      });
    }
    return Response.json(reply satisfies CoachResponse);
  } catch (caught) {
    if (caught instanceof ProviderNotConfiguredError) {
      console.error("[coach]", caught.message);
      return error(503, "Le coach n'est pas disponible pour le moment.");
    }
    if (caught instanceof ProviderError) {
      console.error("[coach]", caught.message);
      const status = caught.status === 429 ? 503 : 502;
      return error(
        status,
        "Le coach n'a pas pu répondre. Réessaie dans un instant.",
      );
    }
    throw caught;
  }
}
