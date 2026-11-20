"use client";

import { useState } from "react";
import { NewGameDialog } from "@/components/chess/new-game-dialog";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_CHOICE,
  resolveSettings,
  settingsSummary,
  type SettingsChoice,
} from "@/lib/chess/game-settings";

/** Démonstration de la fenêtre « Nouvelle partie » et du résumé en lecture seule. */
export function NewGameDemo() {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<SettingsChoice>(DEFAULT_CHOICE);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={() => setOpen(true)}>Nouvelle partie</Button>
      <p className="text-muted-foreground text-sm">
        {settingsSummary(resolveSettings(choice, () => 0))}
      </p>
      <NewGameDialog
        open={open}
        initial={choice}
        onStart={(next) => {
          setChoice(next);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
