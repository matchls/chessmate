"use client";

import { useState } from "react";
import { MoveList } from "@/components/chess/move-list";
import { ReviewControls } from "@/components/chess/review-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  navigate,
  reviewLabel,
  shownCount,
  viewAfterMove,
  type ReviewView,
} from "@/lib/chess/review";

const HISTORY = [
  "e4",
  "e6",
  "c3",
  "c5",
  "Na3",
  "Nf6",
  "Qf3",
  "d5",
  "e5",
  "Nfd7",
];
const CLASSES = [
  undefined,
  undefined,
  undefined,
  undefined,
  "inaccuracy",
  undefined,
  "mistake",
  undefined,
  undefined,
  "blunder",
] as const;

/** Démonstration interactive de la revue des coups (liste cliquable + boutons). */
export function ReviewDemo() {
  const [view, setView] = useState<ReviewView>(null);
  const shown = shownCount(view, HISTORY.length);
  return (
    <div className="flex flex-col gap-3 sm:max-w-sm">
      <p className="text-sm">
        {shown < HISTORY.length ? reviewLabel(HISTORY, shown) : "Direct"}
      </p>
      <ReviewControls
        shown={shown}
        total={HISTORY.length}
        onNavigate={(action) =>
          setView((current) => navigate(current, HISTORY.length, action))
        }
      />
      <Card size="sm">
        <CardHeader>
          <CardTitle>Coups</CardTitle>
        </CardHeader>
        <CardContent>
          <MoveList
            sanHistory={HISTORY}
            classifications={CLASSES}
            shown={shown}
            onSelect={(index) => setView(viewAfterMove(index, HISTORY.length))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
