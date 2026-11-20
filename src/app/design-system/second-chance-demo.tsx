"use client";

import { useState } from "react";
import { SecondChanceOffer } from "@/components/chess/second-chance-offer";

/** Démonstration du bandeau de seconde chance (gaffe, puis erreur). */
export function SecondChanceDemo() {
  const [remaining, setRemaining] = useState(3);
  return (
    <div className="flex flex-col gap-3 sm:max-w-sm">
      <SecondChanceOffer
        moveClass="blunder"
        remaining={remaining}
        total={3}
        onRetry={() => setRemaining((count) => Math.max(count - 1, 0))}
        onContinue={() => setRemaining(3)}
      />
      <SecondChanceOffer
        moveClass="mistake"
        remaining={2}
        total={2}
        onRetry={() => {}}
        onContinue={() => {}}
      />
    </div>
  );
}
