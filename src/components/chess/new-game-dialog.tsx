"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SettingsChoice, SideChoice } from "@/lib/chess/game-settings";
import { BOT_LEVELS } from "@/lib/engine/levels";

type NewGameDialogProps = {
  open: boolean;
  /** Choix proposé à l'ouverture (ceux de la partie précédente). */
  initial: SettingsChoice;
  onStart: (choice: SettingsChoice) => void;
  onCancel: () => void;
};

const SIDES: { value: SideChoice; label: string }[] = [
  { value: "white", label: "Blancs" },
  { value: "black", label: "Noirs" },
  { value: "random", label: "Au hasard" },
];

/**
 * Fenêtre « Nouvelle partie » : niveau du bot et couleur se choisissent ici, avant de
 * commencer. « Annuler » ferme la fenêtre et garde la partie en cours intacte.
 */
export function NewGameDialog({
  open,
  initial,
  onStart,
  onCancel,
}: NewGameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        {/* Remonté à chaque ouverture : repart du choix proposé. */}
        {open && (
          <NewGameForm
            initial={initial}
            onStart={onStart}
            onCancel={onCancel}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewGameForm({
  initial,
  onStart,
  onCancel,
}: Omit<NewGameDialogProps, "open">) {
  const [choice, setChoice] = useState<SettingsChoice>(initial);
  const update = (patch: Partial<SettingsChoice>) =>
    setChoice((current) => ({ ...current, ...patch }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nouvelle partie</DialogTitle>
        <DialogDescription>
          Ces réglages ne changent plus une fois la partie commencée.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3">
        <ChoiceRow label="Niveau du bot">
          {BOT_LEVELS.map((level) => (
            <ChoiceButton
              key={level.id}
              pressed={choice.level === level.id}
              onClick={() => update({ level: level.id })}
            >
              {level.label}
            </ChoiceButton>
          ))}
        </ChoiceRow>
        <ChoiceRow label="Tu joues">
          {SIDES.map((side) => (
            <ChoiceButton
              key={side.value}
              pressed={choice.side === side.value}
              onClick={() => update({ side: side.value })}
            >
              {side.label}
            </ChoiceButton>
          ))}
        </ChoiceRow>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button onClick={() => onStart(choice)}>Commencer</Button>
      </DialogFooter>
    </>
  );
}

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChoiceButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
