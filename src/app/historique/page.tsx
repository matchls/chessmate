import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { historyRow, type HistoryRow } from "@/lib/games/history";

export const metadata: Metadata = { title: "Historique — ChessMate" };

const HISTORY_LIMIT = 50;

const TONE_CLASS: Record<HistoryRow["tone"], string> = {
  win: "text-success",
  loss: "text-destructive",
  draw: "text-muted-foreground",
};

/** Page réservée aux comptes : les parties du joueur connecté, les plus récentes d'abord. */
export default function HistoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 py-8">
      <Suspense>
        <History />
      </Suspense>
    </main>
  );
}

async function History() {
  const user = await requireUser("/historique");
  const games = await getDb().game.findMany({
    where: { userId: user.id },
    orderBy: { playedAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      playedAt: true,
      outcome: true,
      termination: true,
      playerColor: true,
      botLevel: true,
      assisted: true,
      eloBefore: true,
      eloAfter: true,
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique</CardTitle>
        <CardDescription>
          Elo actuel : <span className="font-semibold">{user.elo}</span>
          {games.length === HISTORY_LIMIT &&
            ` · ${HISTORY_LIMIT} dernières parties`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {games.length === 0 ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <p className="text-muted-foreground">
              Aucune partie pour l&apos;instant.
            </p>
            <Link href="/jouer" className={buttonVariants()}>
              Jouer une partie
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Tes parties, les plus récentes d&apos;abord
            </caption>
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1 font-medium">Date</th>
                <th className="py-1 font-medium">Résultat</th>
                <th className="py-1 font-medium">Adversaire</th>
                <th className="py-1 text-right font-medium">Elo</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => {
                const row = historyRow(game);
                return (
                  <tr key={game.id} className="border-border border-t">
                    <td className="py-2">{row.date}</td>
                    <td className="py-2">
                      <span className={`font-medium ${TONE_CLASS[row.tone]}`}>
                        {row.result}
                      </span>{" "}
                      <span className="text-muted-foreground">{row.how}</span>
                    </td>
                    <td className="py-2">
                      {row.opponent}
                      <span className="text-muted-foreground">
                        {" "}
                        · {row.color}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{row.elo}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
