"use client";

import type { Square } from "chess.js";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { MoveList } from "@/components/chess/move-list";
import { CoachPanel } from "@/components/coach/coach-panel";
import { PromotionDialog } from "@/components/chess/promotion-dialog";
import { ReviewControls } from "@/components/chess/review-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCoach } from "@/hooks/use-coach";
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
  statusLabel,
  tryMove,
  type Color,
  type MoveInput,
  type PromotionPiece,
} from "@/lib/chess/game";
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
import {
  BOT_LEVELS,
  BOT_MOVE_DELAY_MS,
  DEFAULT_BOT_LEVEL,
  getBotLevel,
  type BotLevelId,
} from "@/lib/engine/levels";
import { classifyMove, type MoveClass } from "@/lib/engine/evaluation";
import { buildCoachRequest } from "@/lib/coach/client";
import type { HintLevel } from "@/lib/coach/schema";
import {
  coachArrows,
  coachSquareStyles,
  mergeSquareStyles,
} from "@/lib/coach/overlay";

type Side = "white" | "black";
type Mode = "bot" | "local";

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
  const [mode, setMode] = useState<Mode>("bot");
  const [level, setLevel] = useState<BotLevelId>(DEFAULT_BOT_LEVEL);
  /** Camp du joueur : en mode bot, le bot joue l'autre camp. */
  const [playerSide, setPlayerSide] = useState<Side>("white");
  const [flipped, setFlipped] = useState(false);
  /** Coup affiché pendant une revue (null : le direct). */
  const [view, setView] = useState<ReviewView>(null);

  const game = useMemo(() => replay(moves), [moves]);
  const fen = game.fen();
  const status = getStatus(game);
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

  // Coach : à la demande seulement, sur la position affichée. Sa réponse disparaît au coup suivant.
  const coach = useCoach(fen);
  const currentAnalysis = analyses[moves.length];
  const coachBlockedReason = reviewing
    ? "Reviens au direct pour demander un indice."
    : isOver
      ? "La partie est terminée."
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
    if (!isBotTurn || reviewing) return;
    let cancelled = false;
    const { options, limits } = getBotLevel(level);

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
  }, [isBotTurn, reviewing, fen, level, engineRef]);

  function review(action: ReviewAction) {
    setSelected(null);
    setView((current) => navigate(current, moves.length, action));
  }

  // Flèches du clavier : ← → pour naviguer, Début / Fin. Pas pendant la saisie d'une question,
  // ni pendant le choix d'une promotion.
  const total = moves.length;
  const promoting = pendingPromotion !== null;
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

  function newGame(next: { side?: Side; mode?: Mode } = {}) {
    setMoves([]);
    setSelected(null);
    setPendingPromotion(null);
    setFlipped(false);
    setView(null);
    coach.reset();
    if (next.side) setPlayerSide(next.side);
    if (next.mode) setMode(next.mode);
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

  const coachReply = reviewing ? null : coach.session.latest;
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
        <div role="status" aria-live="polite" className="flex flex-col gap-1">
          <p
            className={
              isOver ? "text-lg font-semibold" : "text-base font-medium"
            }
          >
            {statusLabel(status)}
          </p>
          {isBotTurn && (
            <p className="text-muted-foreground text-sm">Le bot réfléchit…</p>
          )}
        </div>

        <CoachPanel
          session={coach.session}
          blockedReason={coachBlockedReason}
          onHint={() => {
            if (!coachBlockedReason) coach.askHint(coachRequest);
          }}
          onQuestion={(question) => {
            if (!coachBlockedReason) coach.askQuestion(question, coachRequest);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => newGame()}>Nouvelle partie</Button>
          <Button variant="outline" onClick={() => setFlipped(!flipped)}>
            Retourner l&apos;échiquier
          </Button>
        </div>

        <ToggleRow label="Adversaire :">
          <ToggleButton
            pressed={mode === "bot"}
            onClick={() => newGame({ mode: "bot" })}
          >
            Bot
          </ToggleButton>
          <ToggleButton
            pressed={mode === "local"}
            onClick={() => newGame({ mode: "local" })}
          >
            À deux
          </ToggleButton>
        </ToggleRow>

        {mode === "bot" && (
          <ToggleRow label="Niveau :">
            {BOT_LEVELS.map((candidate) => (
              <ToggleButton
                key={candidate.id}
                pressed={level === candidate.id}
                onClick={() => setLevel(candidate.id)}
              >
                {candidate.label}
              </ToggleButton>
            ))}
          </ToggleRow>
        )}

        <ToggleRow label="Jouer avec :">
          <ToggleButton
            pressed={playerSide === "white"}
            onClick={() => newGame({ side: "white" })}
          >
            Blancs
          </ToggleButton>
          <ToggleButton
            pressed={playerSide === "black"}
            onClick={() => newGame({ side: "black" })}
          >
            Noirs
          </ToggleButton>
        </ToggleRow>

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
                setView(viewAfterMove(index, moves.length));
              }}
            />
          </CardContent>
        </Card>
      </div>

      <PromotionDialog
        open={pendingPromotion !== null}
        color={turn}
        onSelect={handlePromotion}
        onCancel={() => setPendingPromotion(null)}
      />
    </div>
  );
}

function ToggleRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="text-muted-foreground mr-1">{label}</span>
      {children}
    </div>
  );
}

function ToggleButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      size="sm"
      variant={pressed ? "secondary" : "ghost"}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
