"use client";

import type { Square } from "chess.js";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { MoveList } from "@/components/chess/move-list";
import { CoachPanel } from "@/components/coach/coach-panel";
import { NewGameDialog } from "@/components/chess/new-game-dialog";
import { PromotionDialog } from "@/components/chess/promotion-dialog";
import { ResignDialog } from "@/components/chess/resign-dialog";
import { TurnIndicator } from "@/components/chess/turn-indicator";
import { SecondChanceOffer } from "@/components/chess/second-chance-offer";
import { ReviewControls } from "@/components/chess/review-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCoach } from "@/hooks/use-coach";
import { useExplain } from "@/hooks/use-explain";
import { usePositionAnalysis } from "@/hooks/use-position-analysis";
import { useStockfish } from "@/hooks/use-stockfish";
import {
  checkedKingSquare,
  getStatus,
  isOwnPiece,
  legalTargets,
  needsPromotion,
  positionsOf,
  replay,
  tryMove,
  type Color,
  type MoveInput,
  type PromotionPiece,
} from "@/lib/chess/game";
import {
  DEFAULT_CHOICE,
  resolveSettings,
  settingsSummary,
  type GameSettings,
  type SettingsChoice,
  type Side,
} from "@/lib/chess/game-settings";
import { turnIndicator } from "@/lib/chess/turn-indicator";
import {
  ANALYSIS_WAIT_MS,
  botGate,
  chancesFor,
  chancesLabel,
  withoutLastMove,
  type BotGate,
} from "@/lib/chess/second-chance";
import {
  isReviewing,
  keyToAction,
  navigate,
  reviewLabel,
  shownCount,
  viewAfterMove,
  type ReviewAction,
  type ReviewView,
} from "@/lib/chess/review";
import { BOT_MOVE_DELAY_MS, getBotLevel } from "@/lib/engine/levels";
import { classifyMove, type MoveClass } from "@/lib/engine/evaluation";
import { buildCoachRequest, buildExplainRequest } from "@/lib/coach/client";
import {
  canExplain,
  explainHeading,
  explanationVisuals,
  whyLabel,
} from "@/lib/coach/explain-session";
import type { ExplainStep } from "@/lib/coach/schema";
import type { HintLevel } from "@/lib/coach/schema";
import {
  coachArrows,
  coachSquareStyles,
  mergeSquareStyles,
} from "@/lib/coach/overlay";

const LIGHT_SQUARE: CSSProperties = { backgroundColor: "#f0d9b5" };
const DARK_SQUARE: CSSProperties = { backgroundColor: "#b58863" };
const SELECTED: CSSProperties = { backgroundColor: "rgba(255, 213, 0, 0.5)" };
const LAST_MOVE: CSSProperties = { backgroundColor: "rgba(255, 213, 0, 0.3)" };
const CHECK: CSSProperties = {
  background:
    "radial-gradient(circle, rgba(220, 38, 38, 0.85) 0%, rgba(220, 38, 38, 0) 75%)",
};
const TARGET_EMPTY: CSSProperties = {
  background:
    "radial-gradient(circle, rgba(0, 0, 0, 0.2) 22%, transparent 24%)",
};
const TARGET_CAPTURE: CSSProperties = {
  background:
    "radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.2) 62%)",
};

const sideToColor = (side: Side): Color => (side === "white" ? "w" : "b");
const opposite = (side: Side): Side => (side === "white" ? "black" : "white");

export function GameBoard() {
  const engineRef = useStockfish();

  const [moves, setMoves] = useState<MoveInput[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  /** Réglages de la partie en cours : figés jusqu'à la prochaine « Nouvelle partie ». */
  const [settings, setSettings] = useState<GameSettings>(() =>
    resolveSettings(DEFAULT_CHOICE),
  );
  /** Dernier choix fait dans la fenêtre (garde « au hasard » pour la partie suivante). */
  const [lastChoice, setLastChoice] = useState<SettingsChoice>(DEFAULT_CHOICE);
  /** La fenêtre s'ouvre à l'arrivée sur la page : on choisit avant de jouer. */
  const [settingsOpen, setSettingsOpen] = useState(true);
  const { mode } = settings;
  /** Camp du joueur : en mode bot, le bot joue l'autre camp. */
  const playerSide: Side = settings.side;
  const [flipped, setFlipped] = useState(false);
  /** Coup affiché pendant une revue (null : le direct). */
  const [view, setView] = useState<ReviewView>(null);
  /** Secondes chances utilisées, et coup pour lequel le joueur a choisi « Continuer ». */
  const [chancesUsed, setChancesUsed] = useState(0);
  const [settledAt, setSettledAt] = useState<number | null>(null);
  /** Partie « avec aide » : au moins une seconde chance a servi (gardé avec la partie). */
  const [assisted, setAssisted] = useState(false);
  /** Camp qui a abandonné (gardé avec la partie pour l'historique, #12). */
  const [resignedBy, setResignedBy] = useState<Color | null>(null);
  const [resignOpen, setResignOpen] = useState(false);

  const game = useMemo(() => replay(moves), [moves]);
  const fen = game.fen();
  const status = getStatus(game, resignedBy);
  const isOver = status.kind !== "playing";
  const turn: Color = game.turn();
  const isBotTurn =
    mode === "bot" && !isOver && turn !== sideToColor(playerSide);
  const sanHistory = game.history();

  // Revue : l'échiquier montre la position après `shown` coups, sans toucher à la partie.
  const reviewing = isReviewing(view, moves.length);
  const shown = shownCount(view, moves.length);
  const displayed = useMemo(
    () => (reviewing ? replay(moves.slice(0, shown)) : game),
    [reviewing, moves, shown, game],
  );
  const lastMove = moves[shown - 1];
  const canPlay = !isOver && !isBotTurn && !reviewing;
  /** Abandon : partie en cours, au moins un coup joué. Contre le bot, c'est le joueur qui
   * abandonne ; à deux, le camp qui a le trait. */
  const canResign = !isOver && moves.length > 0;
  const resigningSide: Color = mode === "bot" ? sideToColor(playerSide) : turn;
  const orientation = flipped ? opposite(playerSide) : playerSide;

  // Analyse de chaque position par un second Stockfish, puis classement de chaque coup en
  // comparant la position avant et après. Le meilleur coup reste interne (futur coach).
  const positions = useMemo(() => positionsOf(moves), [moves]);
  const analyses = usePositionAnalysis(positions);
  const classifications: (MoveClass | undefined)[] = moves.map((_, index) => {
    const before = analyses[index];
    const after = analyses[index + 1];
    if (!before || !after) return undefined;
    return classifyMove(before.score, after.score, positions[index].turn);
  });

  // Seconde chance : après une erreur ou une gaffe du joueur, le bot attend sa décision.
  const chancesTotal = chancesFor(settings);
  const chancesLeft = Math.max(chancesTotal - chancesUsed, 0);
  const lastMoveClass = classifications[moves.length - 1];
  const gate: BotGate = isBotTurn
    ? botGate({
        settings,
        used: chancesUsed,
        movesCount: moves.length,
        settledAt,
        lastMoveClass,
      })
    : "play";
  const offer =
    gate === "wait-decision" &&
    (lastMoveClass === "mistake" || lastMoveClass === "blunder")
      ? lastMoveClass
      : null;

  function retryMove() {
    setMoves((current) => withoutLastMove(current));
    setChancesUsed((used) => used + 1);
    setAssisted(true);
    setSelected(null);
    setView(null);
  }

  // Analyse trop lente (ou en panne) : le bot n'attend pas indéfiniment.
  useEffect(() => {
    if (gate !== "wait-analysis") return;
    const count = moves.length;
    const timer = setTimeout(() => setSettledAt(count), ANALYSIS_WAIT_MS);
    return () => clearTimeout(timer);
  }, [gate, moves.length]);

  // Coach : à la demande seulement, sur la position affichée. Sa réponse disparaît au coup suivant.
  const coach = useCoach(fen);

  // « Pourquoi ? » sur un coup signalé : le coup qui a mené à la position affichée, ou celui
  // déjà en cours d'explication.
  const explain = useExplain(moves.length);
  const explanation = explain.explanation;
  const candidate = explanation ? explanation.moveIndex : shown - 1;
  const candidateClass = classifications[candidate];
  const candidateBest = analyses[candidate]?.bestMove;
  const explainable =
    candidateClass !== undefined &&
    candidateClass !== "good" &&
    !!candidateBest &&
    canExplain({
      moveIndex: candidate,
      moveClass: candidateClass,
      mode,
      playerColor: sideToColor(playerSide),
    });

  function askExplanation(step: ExplainStep) {
    const before = analyses[candidate];
    if (!explainable || !before?.bestMove) return;
    setSelected(null);
    // « Pourquoi » : position d'après le coup ; « solution » : position d'avant.
    setView(
      step === "why" ? viewAfterMove(candidate, moves.length) : candidate,
    );
    void explain.ask(
      candidate,
      step,
      buildExplainRequest({
        step,
        fenBefore: positions[candidate].fen,
        played: moves[candidate],
        moveClass: candidateClass,
        before: { ...before, bestMove: before.bestMove },
        after: analyses[candidate + 1],
      }),
    );
  }
  const currentAnalysis = analyses[moves.length];
  const coachBlockedReason = reviewing
    ? "Reviens au direct pour demander un indice."
    : isOver
      ? "La partie est terminée."
      : offer
        ? "Décide d'abord : rejouer ou continuer."
        : isBotTurn
          ? "Attends le coup du bot."
          : !currentAnalysis
            ? "Analyse de la position…"
            : null;

  /** Prépare la demande au coach pour la position affichée, au niveau voulu. */
  function coachRequest(hintLevel: HintLevel, question?: string) {
    const san = sanHistory.at(-1);
    const moveClass = classifications.at(-1);
    return buildCoachRequest({
      fen,
      hintLevel,
      analysis: currentAnalysis,
      lastMove: san ? { san, ...(moveClass ? { moveClass } : {}) } : undefined,
      question,
    });
  }

  // Quand c'est au bot de jouer : on demande un coup à Stockfish après un court délai.
  useEffect(() => {
    if (!isBotTurn || reviewing || gate !== "play") return;
    let cancelled = false;
    if (settings.level === null) return;
    const { options, limits } = getBotLevel(settings.level);

    const timer = setTimeout(async () => {
      const engine = engineRef.current;
      if (!engine) return;
      const move = await engine.bestMove(fen, options, limits);
      if (cancelled || !move) return;
      setMoves((current) => {
        const result = tryMove(current, move);
        return result.ok ? result.moves : current;
      });
    }, BOT_MOVE_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isBotTurn, reviewing, gate, fen, settings.level, engineRef]);

  function review(action: ReviewAction) {
    setSelected(null);
    explain.reset();
    setView((current) => navigate(current, moves.length, action));
  }

  // Flèches du clavier : ← → pour naviguer, Début / Fin. Pas pendant la saisie d'une question,
  // ni pendant le choix d'une promotion.
  const total = moves.length;
  const promoting = pendingPromotion !== null;
  // Naviguer au clavier ferme l'explication en cours (référence stable pour l'écouteur).
  const resetExplainRef = useRef(explain.reset);
  useEffect(() => {
    resetExplainRef.current = explain.reset;
  });
  useEffect(() => {
    if (promoting) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      const action = keyToAction(event.key);
      if (!action) return;
      event.preventDefault();
      setSelected(null);
      resetExplainRef.current();
      setView((current) => navigate(current, total, action));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total, promoting]);

  function play(move: MoveInput): boolean {
    const result = tryMove(moves, move);
    if (!result.ok) return false;
    setMoves(result.moves);
    setSelected(null);
    return true;
  }

  /** Joue from → to, ou ouvre le choix de la pièce si c'est une promotion. */
  function attemptMove(from: Square, to: Square): boolean {
    if (!canPlay) return false;
    if (needsPromotion(game, from, to)) {
      setPendingPromotion({ from, to });
      setSelected(null);
      return false;
    }
    return play({ from, to });
  }

  function handlePieceDrop({
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false;
    return attemptMove(sourceSquare as Square, targetSquare as Square);
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (!canPlay) return;
    const target = square as Square;
    if (selected && legalTargets(game, selected).includes(target)) {
      attemptMove(selected, target);
      return;
    }
    setSelected(
      isOwnPiece(game, target) && target !== selected ? target : null,
    );
  }

  function handlePromotion(piece: PromotionPiece) {
    // Garde-fou : jamais de coup joué pendant une revue (fenêtre ouverte puis ← au clavier).
    if (pendingPromotion && canPlay) {
      play({ ...pendingPromotion, promotion: piece });
    }
    setPendingPromotion(null);
  }

  function startGame(choice: SettingsChoice) {
    setLastChoice(choice);
    setSettings(resolveSettings(choice));
    setSettingsOpen(false);
    resetBoard();
  }

  function resetBoard() {
    setMoves([]);
    setSelected(null);
    setPendingPromotion(null);
    setFlipped(false);
    setView(null);
    coach.reset();
    explain.reset();
    setChancesUsed(0);
    setSettledAt(null);
    setAssisted(false);
    setResignedBy(null);
    setResignOpen(false);
    void engineRef.current?.newGame();
  }

  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE;
    squareStyles[lastMove.to] = LAST_MOVE;
  }
  const kingInCheck = checkedKingSquare(displayed);
  if (kingInCheck) squareStyles[kingInCheck] = CHECK;
  if (selected) {
    squareStyles[selected] = SELECTED;
    for (const target of legalTargets(game, selected)) {
      squareStyles[target] = game.get(target) ? TARGET_CAPTURE : TARGET_EMPTY;
    }
  }

  // Visuels sur l'échiquier : ceux de l'explication en cours, sinon ceux du coach (au direct).
  const coachReply = explanation
    ? (explanationVisuals(explanation) ?? null)
    : reviewing
      ? null
      : coach.session.latest;
  const coachHighlights = coachSquareStyles(coachReply?.highlights ?? []);
  const coachBoardArrows = coachArrows(coachReply?.arrows ?? []);

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
      <div className="mx-auto flex w-full max-w-[min(100%,600px)] flex-1 flex-col gap-3">
        <Chessboard
          options={{
            id: "chessmate-board",
            position: displayed.fen(),
            boardOrientation: orientation,
            lightSquareStyle: LIGHT_SQUARE,
            darkSquareStyle: DARK_SQUARE,
            squareStyles: mergeSquareStyles(squareStyles, coachHighlights),
            arrows: coachBoardArrows,
            allowDrawingArrows: false,
            canDragPiece: ({ piece }) => canPlay && piece.pieceType[0] === turn,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
          }}
        />

        {reviewing && (
          <div
            role="status"
            className="border-or bg-noyer-clair flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <span>{reviewLabel(sanHistory, shown)}</span>
            <Button size="sm" onClick={() => review("last")}>
              Retour au direct
            </Button>
          </div>
        )}

        <ReviewControls
          shown={shown}
          total={moves.length}
          onNavigate={review}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-80">
        <TurnIndicator
          indicator={turnIndicator({
            status,
            mode,
            playerColor: sideToColor(playerSide),
            awaitingDecision: offer !== null,
          })}
        />

        {offer && (
          <SecondChanceOffer
            moveClass={offer}
            remaining={chancesLeft}
            total={chancesTotal}
            onRetry={retryMove}
            onContinue={() => setSettledAt(moves.length)}
          />
        )}

        <CoachPanel
          session={coach.session}
          explain={
            explainable
              ? {
                  heading: explainHeading(
                    candidate,
                    sanHistory[candidate],
                    candidateClass,
                  ),
                  whyLabel: whyLabel(candidateClass),
                  explanation,
                  onWhy: () => askExplanation("why"),
                  onSolution: () => askExplanation("solution"),
                  // Pendant une seconde chance, pas de solution : le joueur cherche lui-même.
                  solutionAllowed: !offer,
                }
              : null
          }
          blockedReason={coachBlockedReason}
          onHint={() => {
            if (!coachBlockedReason) coach.askHint(coachRequest);
          }}
          onQuestion={(question) => {
            if (!coachBlockedReason) coach.askQuestion(question, coachRequest);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSettingsOpen(true)}>Nouvelle partie</Button>
          {canResign && (
            <Button variant="outline" onClick={() => setResignOpen(true)}>
              Abandonner
            </Button>
          )}
          <Button variant="outline" onClick={() => setFlipped(!flipped)}>
            Retourner l&apos;échiquier
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          {settingsSummary(settings)}
          {chancesTotal > 0 && ` · ${chancesLabel(chancesLeft, chancesTotal)}`}
          {assisted && " · Partie avec aide"}
        </p>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Coups</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <MoveList
              sanHistory={sanHistory}
              classifications={classifications}
              shown={shown}
              onSelect={(index) => {
                setSelected(null);
                explain.reset();
                setView(viewAfterMove(index, moves.length));
              }}
            />
          </CardContent>
        </Card>
      </div>

      <ResignDialog
        open={resignOpen && canResign}
        title={
          mode === "bot"
            ? "Abandonner la partie ?"
            : `Les ${turn === "w" ? "blancs" : "noirs"} abandonnent ?`
        }
        description={
          mode === "bot"
            ? "Le bot gagnera la partie."
            : `Les ${turn === "w" ? "noirs" : "blancs"} gagneront la partie.`
        }
        onConfirm={() => {
          setResignedBy(resigningSide);
          setResignOpen(false);
          setSelected(null);
          setPendingPromotion(null);
        }}
        onCancel={() => setResignOpen(false)}
      />

      <NewGameDialog
        open={settingsOpen}
        initial={lastChoice}
        onStart={startGame}
        onCancel={() => setSettingsOpen(false)}
      />

      <PromotionDialog
        open={pendingPromotion !== null}
        color={turn}
        onSelect={handlePromotion}
        onCancel={() => setPendingPromotion(null)}
      />
    </div>
  );
}
