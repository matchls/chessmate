"use client";

import { useEffect, useRef, useState } from "react";
import type { PositionSnapshot } from "@/lib/chess/game";
import { StockfishEngine } from "@/lib/engine/engine";
import { terminalScore, type PositionAnalysis } from "@/lib/engine/evaluation";

/**
 * Analyse chaque position de la partie avec une seconde instance de Stockfish (l'« analyste »),
 * distincte de celle du bot. Les résultats sont gardés par position (FEN) ; si un nouveau coup
 * arrive pendant une analyse, celle-ci est abandonnée et la suivante démarre.
 *
 * Renvoie un tableau aligné sur `positions` : `undefined` tant que la position n'est pas analysée.
 */
export function usePositionAnalysis(
  positions: readonly PositionSnapshot[],
): (PositionAnalysis | undefined)[] {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [cache, setCache] = useState<Record<string, PositionAnalysis>>({});

  useEffect(() => {
    const engine = new StockfishEngine();
    engineRef.current = engine;
    return () => {
      engine.terminate();
      engineRef.current = null;
    };
  }, []);

  // Position la plus ancienne qui n'a pas encore d'analyse (les positions terminées n'en ont
  // pas besoin : leur score se déduit du résultat).
  const pending = positions.find(
    (position) =>
      terminalScore(position.status) === null && !cache[position.fen],
  );
  const pendingFen = pending?.fen;

  useEffect(() => {
    if (!pendingFen) return;
    let cancelled = false;
    void engineRef.current?.analyse(pendingFen).then((analysis) => {
      if (cancelled || !analysis) return;
      setCache((current) => ({ ...current, [pendingFen]: analysis }));
    });
    return () => {
      cancelled = true;
    };
  }, [pendingFen]);

  return positions.map((position) => {
    const terminal = terminalScore(position.status);
    if (terminal) return { score: terminal, bestMove: null, pv: [], depth: 0 };
    return cache[position.fen];
  });
}
