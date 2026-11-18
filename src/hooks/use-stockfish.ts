"use client";

import { useEffect, useRef } from "react";
import { StockfishEngine } from "@/lib/engine/engine";

/**
 * Démarre Stockfish (dans un Web Worker) quand le composant s'affiche et l'arrête quand il
 * disparaît. Renvoie une référence : `engineRef.current` est null tant que le moteur n'existe pas.
 */
export function useStockfish() {
  const engineRef = useRef<StockfishEngine | null>(null);

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    return () => {
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  return engineRef;
}
