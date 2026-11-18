"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PROMOTION_PIECES,
  type Color,
  type PromotionPiece,
} from "@/lib/chess/game";

const PIECE_LABEL: Record<PromotionPiece, string> = {
  q: "Dame",
  r: "Tour",
  b: "Fou",
  n: "Cavalier",
};

const PIECE_SYMBOL: Record<Color, Record<PromotionPiece, string>> = {
  w: { q: "♕", r: "♖", b: "♗", n: "♘" },
  b: { q: "♛", r: "♜", b: "♝", n: "♞" },
};

type PromotionDialogProps = {
  open: boolean;
  color: Color;
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
};

export function PromotionDialog({
  open,
  color,
  onSelect,
  onCancel,
}: PromotionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Promotion du pion</DialogTitle>
          <DialogDescription>
            Choisis la pièce qui remplace ton pion.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-2">
          {PROMOTION_PIECES.map((piece) => (
            <Button
              key={piece}
              variant="outline"
              className="h-auto flex-col gap-1 py-3"
              onClick={() => onSelect(piece)}
            >
              <span aria-hidden className="text-3xl leading-none">
                {PIECE_SYMBOL[color][piece]}
              </span>
              <span className="text-xs">{PIECE_LABEL[piece]}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
