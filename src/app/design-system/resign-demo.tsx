"use client";

import { useState } from "react";
import { ResignDialog } from "@/components/chess/resign-dialog";
import { Button } from "@/components/ui/button";

/** Démonstration de la confirmation d'abandon. */
export function ResignDemo() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("Partie en cours");
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Abandonner
      </Button>
      <p className="text-muted-foreground text-sm">{result}</p>
      <ResignDialog
        open={open}
        title="Abandonner la partie ?"
        description="Le bot gagnera la partie."
        onConfirm={() => {
          setResult("Les noirs gagnent par abandon");
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
