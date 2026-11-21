import { headers } from "next/headers";
import { getAuth } from "@/lib/auth/auth";
import { createRateLimiter } from "@/lib/coach/rate-limit";
import { getDb } from "@/lib/db";
import { InvalidGameError, saveGameSchema } from "@/lib/games/record";
import { saveGame } from "@/lib/games/save";

/**
 * POST /api/games : enregistre une partie terminée du joueur connecté et met à jour son Elo.
 * Le serveur revérifie tout : session, forme de la demande (Zod), légalité des coups, fin de
 * partie et Elo (recalculés à partir de la base). Aucune sauvegarde en invité.
 */

const limiter = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });
const MAX_BODY_BYTES = 20_000;

const error = (status: number, message: string) =>
  Response.json({ error: message }, { status });

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return error(503, "Base de données indisponible.");
  }
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return error(401, "Connecte-toi pour enregistrer tes parties.");

  const limit = limiter(session.user.id);
  if (!limit.allowed) {
    return Response.json(
      { error: "Trop d'enregistrements, réessaie plus tard." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return error(413, "Partie trop longue.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "Demande invalide.");
  }
  const parsed = saveGameSchema.safeParse(body);
  if (!parsed.success) return error(400, "Demande invalide.");

  try {
    const result = await saveGame(getDb(), session.user.id, parsed.data);
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (caught) {
    if (caught instanceof InvalidGameError) return error(400, caught.message);
    console.error("[games] enregistrement impossible", caught);
    return error(500, "Enregistrement impossible pour le moment.");
  }
}
