"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ResignDialogProps = {
  open: boolean;
  /** Question posée, par exemple « Abandonner la partie ? » ou « Les blancs abandonnent ? ». */
  title: string;
  /** Conséquence, par exemple « Le bot gagnera la partie. ». */
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmation avant d'abandonner : un clic par erreur ne doit pas finir la partie. */
export function ResignDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: ResignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Continuer la partie
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Abandonner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
