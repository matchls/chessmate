"use client";

import { Button } from "@/components/ui/button";
import { chancesLabel, offerMessage } from "@/lib/chess/second-chance";

type SecondChanceOfferProps = {
  moveClass: "mistake" | "blunder";
  /** Chances restantes avant de rejouer, et total de la partie. */
  remaining: number;
  total: number;
  onRetry: () => void;
  onContinue: () => void;
};

/** Bandeau « Veux-tu rejouer ce coup ? », affiché juste après une erreur ou une gaffe. */
export function SecondChanceOffer({
  moveClass,
  remaining,
  total,
  onRetry,
  onContinue,
}: SecondChanceOfferProps) {
  return (
    <div
      role="alert"
      className="border-or bg-noyer-clair flex flex-col gap-2 rounded-md border p-3 text-sm"
    >
      <p>{offerMessage(moveClass)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onRetry}>Rejouer</Button>
        <Button variant="outline" onClick={onContinue}>
          Continuer
        </Button>
        <span className="text-muted-foreground text-xs">
          {chancesLabel(remaining, total)}
        </span>
      </div>
    </div>
  );
}
