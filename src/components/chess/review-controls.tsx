"use client";

import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReviewAction } from "@/lib/chess/review";

type ReviewControlsProps = {
  shown: number;
  total: number;
  onNavigate: (action: ReviewAction) => void;
};

const BUTTONS: {
  action: ReviewAction;
  label: string;
  Icon: typeof ChevronLeft;
}[] = [
  { action: "first", label: "Premier coup", Icon: ChevronFirst },
  { action: "prev", label: "Coup précédent", Icon: ChevronLeft },
  { action: "next", label: "Coup suivant", Icon: ChevronRight },
  { action: "last", label: "Dernier coup (direct)", Icon: ChevronLast },
];

/** Boutons de navigation dans les coups joués, assez grands pour le doigt. */
export function ReviewControls({
  shown,
  total,
  onNavigate,
}: ReviewControlsProps) {
  return (
    <div
      className="flex justify-center gap-2"
      role="group"
      aria-label="Revoir les coups"
    >
      {BUTTONS.map(({ action, label, Icon }) => {
        const atStart = shown === 0;
        const atEnd = shown >= total;
        const disabled =
          action === "first" || action === "prev" ? atStart : atEnd;
        return (
          <Button
            key={action}
            variant="outline"
            size="icon-lg"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={() => onNavigate(action)}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}
