import { formatClock, LOW_TIME_MS } from "@/lib/chess/time-controls";

type ChessClockProps = {
  /** Qui joue ce camp : « Toi », « Bot 1000 ». */
  label: string;
  remainingMs: number;
  /** Pendule qui décompte en ce moment. */
  active: boolean;
};

/**
 * Une pendule : nom du joueur et temps restant. La pendule active est mise en avant
 * (fond parchemin) ; sous 10 secondes, elle passe en bordeaux et affiche les dixièmes.
 */
export function ChessClock({ label, remainingMs, active }: ChessClockProps) {
  const low = remainingMs < LOW_TIME_MS;
  const tone = active
    ? low
      ? "bg-bordeaux text-parchemin border-bordeaux-300"
      : "bg-parchemin text-encre border-or"
    : low
      ? "bg-noyer-clair text-bordeaux-300 border-noyer-clair"
      : "bg-noyer-clair text-parchemin border-noyer-clair";
  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-1.5 ${tone}`}
    >
      <span className="text-sm font-medium">
        {label}
        {active && <span className="sr-only"> (pendule en marche)</span>}
      </span>
      <span
        role="timer"
        aria-label={`Temps restant, ${label}`}
        className="font-mono text-xl font-semibold tabular-nums"
      >
        {formatClock(remainingMs)}
      </span>
    </div>
  );
}
