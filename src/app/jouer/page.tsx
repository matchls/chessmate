import type { Metadata } from "next";
import { GameBoard } from "@/components/chess/game-board";

export const metadata: Metadata = {
  title: "Jouer — ChessMate",
};

export default function PlayPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Partie</h1>
      <GameBoard />
    </main>
  );
}
