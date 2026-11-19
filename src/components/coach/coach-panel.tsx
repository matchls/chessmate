"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachState } from "@/hooks/use-coach";
import { QUESTION_MAX_LENGTH } from "@/lib/coach/client";

type CoachPanelProps = {
  state: CoachState;
  /** Raison pour laquelle on ne peut pas demander maintenant (null : on peut). */
  blockedReason: string | null;
  onHint: () => void;
  onQuestion: (question: string) => void;
};

/**
 * Panneau du coach : un indice à la demande, ou une question libre. Le coach n'intervient
 * jamais de lui-même, et la partie reste jouable s'il échoue.
 */
export function CoachPanel({
  state,
  blockedReason,
  onHint,
  onQuestion,
}: CoachPanelProps) {
  const [question, setQuestion] = useState("");
  const loading = state.status === "loading";
  const disabled = blockedReason !== null || loading;

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || disabled) return;
    onQuestion(trimmed);
    setQuestion("");
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Coach</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          aria-live="polite"
          className="flex min-h-12 flex-col gap-1 text-sm"
        >
          {"question" in state && state.question && (
            <p className="text-muted-foreground italic">
              Ta question : {state.question}
            </p>
          )}
          {state.status === "idle" && (
            <p className="text-muted-foreground">
              Bloqué ? Demande un indice : le coach te montre où regarder, sans
              jamais te donner le coup.
            </p>
          )}
          {state.status === "loading" && (
            <p className="text-muted-foreground">Le coach réfléchit…</p>
          )}
          {state.status === "answer" && <p>{state.response.message}</p>}
          {state.status === "error" && (
            <p className="text-destructive">{state.message}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onHint} disabled={disabled}>
            Un indice ?
          </Button>
          {blockedReason && (
            <span className="text-muted-foreground text-xs">
              {blockedReason}
            </span>
          )}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor="coach-question" className="sr-only">
            Pose ta question au coach
          </label>
          <textarea
            id="coach-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) submit(event);
            }}
            maxLength={QUESTION_MAX_LENGTH}
            rows={2}
            placeholder="Pose ta question (ex. : pourquoi pas Fc4 ?)"
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-lg border px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={disabled || question.trim() === ""}
            className="self-end"
          >
            Demander
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
