import type { PrismaClient } from "@/generated/prisma/client";
import { prepareGame, type SaveGameInput } from "@/lib/games/record";

export type SaveResult = {
  /** Faux si la partie avait déjà été enregistrée (double envoi). */
  created: boolean;
  counted: boolean;
  eloBefore: number | null;
  eloAfter: number | null;
};

/**
 * Enregistre la partie et met à jour l'Elo en une seule transaction : la partie et l'Elo ne
 * peuvent pas se retrouver désynchronisés. Une même partie (clientGameId) n'est comptée qu'une
 * fois.
 */
export async function saveGame(
  db: PrismaClient,
  userId: string,
  input: SaveGameInput,
): Promise<SaveResult> {
  return db.$transaction(async (tx) => {
    const existing = await tx.game.findUnique({
      where: { clientGameId: input.clientGameId },
      select: { userId: true, eloBefore: true, eloAfter: true },
    });
    if (existing) {
      // Même identifiant envoyé deux fois : on renvoie le résultat déjà enregistré.
      if (existing.userId !== userId)
        throw new Error("Identifiant de partie déjà utilisé");
      return {
        created: false,
        counted: existing.eloAfter !== null,
        eloBefore: existing.eloBefore,
        eloAfter: existing.eloAfter,
      };
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { elo: true },
    });
    const countedGames = await tx.game.count({
      where: { userId, eloAfter: { not: null } },
    });
    const game = prepareGame(input, { elo: user.elo, countedGames });

    await tx.game.create({
      data: { ...game, mode: "BOT", clientGameId: input.clientGameId, userId },
    });
    if (game.eloAfter !== null) {
      await tx.user.update({
        where: { id: userId },
        data: { elo: game.eloAfter },
      });
    }
    return {
      created: true,
      counted: game.eloAfter !== null,
      eloBefore: game.eloBefore,
      eloAfter: game.eloAfter,
    };
  });
}
