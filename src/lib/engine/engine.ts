import type { Color, MoveInput } from "@/lib/chess/game";
import {
  ANALYSIS_LIMITS,
  ANALYSIS_OPTIONS,
  buildAnalysis,
  type PositionAnalysis,
} from "@/lib/engine/evaluation";
import {
  goCommand,
  parseBestMove,
  parseInfo,
  positionCommand,
  setOptionCommand,
  type EngineInfo,
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

  /**
   * Envoie une commande et attend la première ligne qui vérifie `match`.
   * `onLine` reçoit au passage toutes les lignes précédentes (ex. les lignes `info`).
   */
  private waitFor(
    command: string,
    match: (line: string) => boolean,
    onLine?: LineListener,
  ): Promise<string> {
    return new Promise((resolve) => {
      const listener: LineListener = (line) => {
        if (!match(line)) {
          onLine?.(line);
          return;
        }
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
   * Lance une recherche sur `fen`. Renvoie la ligne `bestmove`, ou null si une autre demande
   * l'a remplacée entre-temps. `onLine` reçoit les lignes intermédiaires.
   */
  private async search(
    fen: string,
    options: Record<string, EngineOptionValue>,
    limits: GoLimits,
    onLine?: LineListener,
  ): Promise<string | null> {
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
      onLine,
    );
    return id === this.searchId ? line : null;
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
    const line = await this.search(fen, options, limits);
    return line ? (parseBestMove(line) ?? null) : null;
  }

  /**
   * Analyse la position à pleine puissance : score (côté blancs), meilleur coup, ligne
   * principale. Renvoie null si une autre demande l'a remplacée.
   */
  async analyse(fen: string): Promise<PositionAnalysis | null> {
    const infos: EngineInfo[] = [];
    const line = await this.search(
      fen,
      ANALYSIS_OPTIONS,
      ANALYSIS_LIMITS,
      (l) => {
        const info = parseInfo(l);
        if (info) infos.push(info);
      },
    );
    if (!line) return null;
    const turn = fen.split(" ")[1] as Color;
    return buildAnalysis(infos, line, turn);
  }

  terminate() {
    this.searchId += 1;
    this.listeners.clear();
    this.worker.terminate();
  }
}
