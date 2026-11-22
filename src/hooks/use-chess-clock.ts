"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createClock,
  flagged,
  press,
  tick,
  undoPress,
  type ClockState,
} from "@/lib/chess/clock";
import type { TimeControlId } from "@/lib/chess/time-controls";

/** Fréquence du tic : assez fine pour afficher les dixièmes sous 10 s. */
const TICK_MS = 100;

/**
 * Pendule de la partie en cours (null : sans limite). La logique vit dans `lib/chess/clock` ;
 * ce hook garde l'état et fournit l'heure. Le tic régulier est lancé par `useClockTicker`,
 * appelé plus loin, une fois connu si la pendule doit tourner.
 */
export function useChessClock() {
  const [clock, setClock] = useState<ClockState | null>(null);
  const clockRef = useRef(clock);
  useEffect(() => {
    clockRef.current = clock;
  });

  /** Avance la pendule jusqu'à maintenant (décompte seulement si `running`). */
  const tickNow = useCallback((running: boolean) => {
    setClock((current) =>
      current && !flagged(current)
        ? tick(current, Date.now(), running)
        : current,
    );
  }, []);

  /** Nouvelle partie : pendule remise à zéro (les blancs commencent). */
  const start = useCallback((control: TimeControlId) => {
    const next = createClock(control, Date.now());
    clockRef.current = next;
    setClock(next);
  }, []);

  /**
   * Appui après un coup. Renvoie faux si le temps du camp au trait était déjà écoulé :
   * le coup arrive trop tard et ne doit pas être joué.
   */
  const pressClock = useCallback((): boolean => {
    const current = clockRef.current;
    if (!current) return true;
    const next = press(current, Date.now());
    clockRef.current = next;
    setClock(next);
    return flagged(next) === null;
  }, []);

  /** « Rejouer » d'une seconde chance : la pendule revient à l'instant du coup annulé. */
  const undo = useCallback(() => {
    const current = clockRef.current;
    if (!current) return;
    const next = undoPress(current, Date.now());
    clockRef.current = next;
    setClock(next);
  }, []);

  /** Pendule à jour, pour un calcul hors rendu (temps de réflexion du bot). */
  const latest = useCallback(() => clockRef.current, []);

  return { clock, start, press: pressClock, undo, latest, tickNow };
}

/**
 * Tic régulier de la pendule. `ticking` : partie en cours avec pendule (une fois la partie finie,
 * la pendule reste figée). `running` : faux pendant une pause (seconde chance, attente de
 * l'analyse) ; le tic continue alors sans rien décompter.
 */
export function useClockTicker(
  tickNow: (running: boolean) => void,
  { ticking, running }: { ticking: boolean; running: boolean },
) {
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => tickNow(running), TICK_MS);
    return () => clearInterval(id);
  }, [ticking, running, tickNow]);
}
