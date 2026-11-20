import { TurnIndicator } from "@/components/chess/turn-indicator";
import { turnIndicator } from "@/lib/chess/turn-indicator";

/** Les états de l'indicateur de trait. */
export function TurnDemo() {
  const states = [
    turnIndicator({
      status: { kind: "playing", turn: "w", check: false },
      mode: "bot",
      playerColor: "w",
    }),
    turnIndicator({
      status: { kind: "playing", turn: "b", check: false },
      mode: "bot",
      playerColor: "w",
    }),
    turnIndicator({
      status: { kind: "playing", turn: "w", check: true },
      mode: "local",
      playerColor: "w",
    }),
    turnIndicator({
      status: { kind: "playing", turn: "b", check: false },
      mode: "bot",
      playerColor: "w",
      awaitingDecision: true,
    }),
    turnIndicator({
      status: { kind: "checkmate", winner: "b" },
      mode: "bot",
      playerColor: "w",
    }),
    turnIndicator({
      status: { kind: "draw", reason: "stalemate" },
      mode: "bot",
      playerColor: "w",
    }),
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {states.map((indicator) => (
        <TurnIndicator key={indicator.label} indicator={indicator} />
      ))}
    </div>
  );
}
