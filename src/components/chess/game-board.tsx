"use client";

import type { Square } from "chess.js";
import { useMemo, useState, type CSSProperties } from "react";
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { MoveList } from "@/components/chess/move-list";
import { PromotionDialog } from "@/components/chess/promotion-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  checkedKingSquare,
  getStatus,
  isOwnPiece,
  legalTargets,
  needsPromotion,
  replay,
  statusLabel,
  tryMove,
  type Color,
  type MoveInput,
  type PromotionPiece,
} from "@/lib/chess/game";

type Orientation = "white" | "black";

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

export function GameBoard() {
  const [moves, setMoves] = useState<MoveInput[]>([]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [orientation, setOrientation] = useState<Orientation>("white");

  const game = useMemo(() => replay(moves), [moves]);
  const status = getStatus(game);
  const isOver = status.kind !== "playing";
  const sanHistory = game.history();
  const lastMove = moves.at(-1);

  function play(move: MoveInput): boolean {
    const result = tryMove(moves, move);
    if (!result.ok) return false;
    setMoves(result.moves);
    setSelected(null);
    return true;
  }

  /** Joue from → to, ou ouvre le choix de la pièce si c'est une promotion. */
  function attemptMove(from: Square, to: Square): boolean {
    if (isOver) return false;
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
    if (isOver) return;
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
    if (pendingPromotion) play({ ...pendingPromotion, promotion: piece });
    setPendingPromotion(null);
  }

  function newGame(side: Orientation = orientation) {
    setMoves([]);
    setSelected(null);
    setPendingPromotion(null);
    setOrientation(side);
  }

  const squareStyles: Record<string, CSSProperties> = {};
  if (lastMove) {
    squareStyles[lastMove.from] = LAST_MOVE;
    squareStyles[lastMove.to] = LAST_MOVE;
  }
  const kingInCheck = checkedKingSquare(game);
  if (kingInCheck) squareStyles[kingInCheck] = CHECK;
  if (selected) {
    squareStyles[selected] = SELECTED;
    for (const target of legalTargets(game, selected)) {
      squareStyles[target] = game.get(target) ? TARGET_CAPTURE : TARGET_EMPTY;
    }
  }

  const turn: Color = game.turn();

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
      <div className="mx-auto w-full max-w-[min(100%,600px)] flex-1">
        <Chessboard
          options={{
            id: "chessmate-board",
            position: game.fen(),
            boardOrientation: orientation,
            lightSquareStyle: LIGHT_SQUARE,
            darkSquareStyle: DARK_SQUARE,
            squareStyles,
            allowDrawingArrows: false,
            canDragPiece: ({ piece }) => !isOver && piece.pieceType[0] === turn,
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
          }}
        />
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-72">
        <p
          role="status"
          aria-live="polite"
          className={isOver ? "text-lg font-semibold" : "text-base font-medium"}
        >
          {statusLabel(status)}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => newGame()}>Nouvelle partie</Button>
          <Button
            variant="outline"
            onClick={() =>
              setOrientation(orientation === "white" ? "black" : "white")
            }
          >
            Retourner l&apos;échiquier
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Jouer avec :</span>
          <Button
            size="sm"
            variant={orientation === "white" ? "secondary" : "ghost"}
            aria-pressed={orientation === "white"}
            onClick={() => newGame("white")}
          >
            Blancs
          </Button>
          <Button
            size="sm"
            variant={orientation === "black" ? "secondary" : "ghost"}
            aria-pressed={orientation === "black"}
            onClick={() => newGame("black")}
          >
            Noirs
          </Button>
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle>Coups</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-y-auto">
            <MoveList sanHistory={sanHistory} />
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
