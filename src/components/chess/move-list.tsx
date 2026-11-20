"use client";

import { toMovePairs } from "@/lib/chess/game";
import { MOVE_CLASS_INFO, type MoveClass } from "@/lib/engine/evaluation";

type MoveListProps = {
  sanHistory: readonly string[];
  /** Classement de chaque coup, aligné sur `sanHistory` (undefined = pas encore analysé). */
  classifications?: readonly (MoveClass | undefined)[];
  /** Nombre de coups affichés sur l'échiquier : le dernier d'entre eux est mis en évidence. */
  shown?: number;
  /** Clic sur un coup (indice dans `sanHistory`) : afficher la position après ce coup. */
  onSelect?: (moveIndex: number) => void;
};

/* Couleurs lisibles sur le parchemin de la carte (docs/design-system.md, contrastes). */
const CLASS_COLOR: Record<MoveClass, string> = {
  good: "",
  inaccuracy: "text-or-900",
  mistake: "text-bordeaux",
  blunder: "text-destructive font-bold",
};

function MoveCell({
  san,
  moveClass,
  index,
  current,
  onSelect,
}: {
  san?: string;
  moveClass?: MoveClass;
  index: number;
  current: boolean;
  onSelect?: (moveIndex: number) => void;
}) {
  if (!san) return <span />;
  const info =
    moveClass && moveClass !== "good" ? MOVE_CLASS_INFO[moveClass] : null;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(index)}
      aria-current={current ? "step" : undefined}
      title={info?.label}
      className={`-mx-1 cursor-pointer rounded-sm px-1 py-0.5 text-left ${
        current ? "bg-or-100 font-semibold" : "hover:bg-or-100/60"
      }`}
    >
      {san}
      {info && moveClass && (
        <>
          <span
            aria-hidden
            className={`font-semibold ${CLASS_COLOR[moveClass]}`}
          >
            {info.symbol}
          </span>
          <span className="sr-only"> ({info.label})</span>
        </>
      )}
    </button>
  );
}

export function MoveList({
  sanHistory,
  classifications = [],
  shown = sanHistory.length,
  onSelect,
}: MoveListProps) {
  if (sanHistory.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucun coup joué.</p>;
  }

  return (
    <ol className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-3 gap-y-0.5 font-mono text-sm">
      {toMovePairs(sanHistory).map((pair) => {
        const whiteIndex = (pair.number - 1) * 2;
        return (
          <li key={pair.number} className="contents">
            <span className="text-muted-foreground">{pair.number}.</span>
            {[whiteIndex, whiteIndex + 1].map((index) => (
              <MoveCell
                key={index}
                san={sanHistory[index]}
                moveClass={classifications[index]}
                index={index}
                current={shown === index + 1}
                onSelect={onSelect}
              />
            ))}
          </li>
        );
      })}
    </ol>
  );
}
