import type { MoveInput } from "@/lib/chess/game";
import {
  goCommand,
  parseBestMove,
  positionCommand,
  setOptionCommand,
  type EngineOptionValue,
  type GoLimits,
} from "@/lib/engine/uci";

/** Moteur Stockfish servi depuis `public/engine/` (voir le README du dossier). */
export const STOCKFISH_URL = "/engine/stockfish-19-lite-single.js";

type LineListener = (line: string) => void;

/**
 * Stockfish dans un Web Worker : il calcule à côté de la page, qui reste fluide.
 * Une seule recherche à la fois : une nouvelle demande arrête la précédente.
 * À utiliser uniquement côté navigateur.
 */
export class StockfishEngine {
  private readonly worker: Worker;
  private readonly listeners = new Set<LineListener>();
  private ready: Promise<void>;
  private searchId = 0;

  constructor(url: string = STOCKFISH_URL) {
    this.worker = new Worker(url);
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      const line = String(event.data);
      for (const listener of this.listeners) listener(line);
    };
    this.ready = this.init();
  }

  private send(command: string) {
    this.worker.postMessage(command);
  }

  /** Envoie une commande et attend la première ligne qui vérifie `match`. */
  private waitFor(
    command: string,
    match: (line: string) => boolean,
  ): Promise<string> {
    return new Promise((resolve) => {
      const listener: LineListener = (line) => {
        if (!match(line)) return;
        this.listeners.delete(listener);
        resolve(line);
      };
      this.listeners.add(listener);
      this.send(command);
    });
  }

  private async init() {
    await this.waitFor("uci", (line) => line === "uciok");
    await this.waitFor("isready", (line) => line === "readyok");
  }

  /** À appeler au début de chaque nouvelle partie. */
  async newGame() {
    await this.ready;
    this.searchId += 1;
    this.send("stop");
    this.send("ucinewgame");
    this.ready = this.waitFor("isready", (line) => line === "readyok").then(
      () => undefined,
    );
    await this.ready;
  }

  /**
   * Demande le meilleur coup pour la position `fen` avec les réglages donnés.
   * Renvoie null si le moteur n'a pas de coup, ou si une autre demande l'a remplacée.
   */
  async bestMove(
    fen: string,
    options: Record<string, EngineOptionValue>,
    limits: GoLimits,
  ): Promise<MoveInput | null> {
    await this.ready;
    const id = ++this.searchId;
    this.send("stop");
    for (const [name, value] of Object.entries(options)) {
      this.send(setOptionCommand(name, value));
    }
    await this.waitFor("isready", (line) => line === "readyok");
    if (id !== this.searchId) return null;

    this.send(positionCommand(fen));
    const line = await this.waitFor(
      goCommand(limits),
      (l) => parseBestMove(l) !== undefined,
    );
    if (id !== this.searchId) return null;
    return parseBestMove(line) ?? null;
  }

  terminate() {
    this.searchId += 1;
    this.listeners.clear();
    this.worker.terminate();
  }
}
