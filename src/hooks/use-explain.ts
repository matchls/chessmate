"use client";

import { useEffect, useRef, useState } from "react";
import { requestExplain, type ExplainRequestInput } from "@/lib/coach/client";
import type { Explanation } from "@/lib/coach/explain-session";
import type { ExplainStep } from "@/lib/coach/schema";

/**
 * Explication d'un coup signalé : « Pourquoi ? », puis « Voir la solution ».
 * Elle est liée à un coup et à la longueur de la partie : si un coup est joué entre-temps,
 * elle disparaît et la demande en cours est annulée.
 */
export function useExplain(total: number) {
  const [stored, setStored] = useState<Explanation | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, [total]);

  const explanation = stored && stored.total === total ? stored : null;

  async function ask(
    moveIndex: number,
    step: ExplainStep,
    request: ExplainRequestInput,
  ) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const keep =
      explanation && explanation.moveIndex === moveIndex ? explanation : null;
    setStored({
      moveIndex,
      total,
      step,
      ...(keep?.why ? { why: keep.why } : {}),
      loading: true,
      error: null,
    });

    const outcome = await requestExplain(request, {
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    controllerRef.current = null;
    setStored((current) => {
      if (!current || current.moveIndex !== moveIndex) return current;
      if (!outcome.ok) {
        return { ...current, loading: false, error: outcome.message };
      }
      return { ...current, loading: false, [step]: outcome.response };
    });
  }

  function reset() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStored(null);
  }

  return { explanation, ask, reset };
}
