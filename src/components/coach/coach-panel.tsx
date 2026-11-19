"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QUESTION_MAX_LENGTH } from "@/lib/coach/client";
import {
  hintButtonLabel,
  nextHintLevel,
  type CoachSession,
} from "@/lib/coach/session";

type CoachPanelProps = {
  session: CoachSession;
  /** Raison pour laquelle on ne peut pas demander maintenant (null : on peut). */
  blockedReason: string | null;
  onHint: () => void;
  onQuestion: (question: string) => void;
};

/**
 * Panneau du coach : des indices de plus en plus précis (trois au maximum par position),
 * ou une question libre. Le coach n'intervient jamais de lui-même, et la partie reste
 * jouable s'il échoue.
 */
export function CoachPanel({
  session,
  blockedReason,
  onHint,
  onQuestion,
}: CoachPanelProps) {
  const [question, setQuestion] = useState("");
  const blocked = blockedReason !== null || session.loading;
  const noMoreHints = nextHintLevel(session) === null;
  const empty =
    session.hints.length === 0 && !session.exchange && !session.loading;

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || blocked) return;
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
          className="flex min-h-12 flex-col gap-2 text-sm"
        >
          {empty && (
            <p className="text-muted-foreground">
              Bloqué ? Demande un indice : le coach t&apos;en dit un peu plus à
              chaque fois, sans jamais te donner le coup.
            </p>
          )}

          {session.hints.length > 0 && (
            <ol className="flex flex-col gap-2">
              {session.hints.map((hint) => (
                <li key={hint.hintLevel} className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-xs font-medium">
                    Indice {hint.hintLevel}
                  </span>
                  <p>{hint.message}</p>
                </li>
              ))}
            </ol>
          )}

          {session.exchange && (
            <div className="flex flex-col gap-0.5">
              <p className="text-muted-foreground italic">
                Ta question : {session.exchange.question}
              </p>
              {session.exchange.response && (
                <p>{session.exchange.response.message}</p>
              )}
            </div>
          )}

          {session.loading && (
            <p className="text-muted-foreground">Le coach réfléchit…</p>
          )}
          {session.error && <p className="text-destructive">{session.error}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onHint} disabled={blocked || noMoreHints}>
            {hintButtonLabel(session)}
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
            disabled={blocked || question.trim() === ""}
            className="self-end"
          >
            Demander
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
