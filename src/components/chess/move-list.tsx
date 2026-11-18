import { toMovePairs } from "@/lib/chess/game";
import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/engine/evaluation";

type MoveListProps = {
  sanHistory: readonly string[];
  /** Classement de chaque coup, aligné sur `sanHistory` (undefined = pas encore analysé). */
  classifications?: readonly (MoveClass | undefined)[];
};

const CLASS_COLOR: Record<MoveClass, string> = {
  good: "",
  inaccuracy: "text-amber-600 dark:text-amber-400",
  mistake: "text-orange-600 dark:text-orange-400",
  blunder: "text-red-600 dark:text-red-400",
};

function MoveCell({ san, moveClass }: { san?: string; moveClass?: MoveClass }) {
  if (!san) return <span />;
  if (!moveClass || moveClass === "good") return <span>{san}</span>;
  const { symbol, label } = MOVE_CLASS_INFO[moveClass];
  return (
    <span title={label}>
      {san}
      <span aria-hidden className={`font-semibold ${CLASS_COLOR[moveClass]}`}>
        {symbol}
      </span>
      <span className="sr-only"> ({label})</span>
    </span>
  );
}

export function MoveList({ sanHistory, classifications = [] }: MoveListProps) {
  if (sanHistory.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucun coup joué.</p>;
  }

  return (
    <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 font-mono text-sm">
      {toMovePairs(sanHistory).map((pair) => {
        const whiteIndex = (pair.number - 1) * 2;
        return (
          <li key={pair.number} className="contents">
            <span className="text-muted-foreground">{pair.number}.</span>
            <MoveCell
              san={pair.white}
              moveClass={classifications[whiteIndex]}
            />
            <MoveCell
              san={pair.black}
              moveClass={classifications[whiteIndex + 1]}
            />
          </li>
        );
      })}
    </ol>
  );
}
