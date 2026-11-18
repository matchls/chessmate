import { toMovePairs } from "@/lib/chess/game";

type MoveListProps = {
  sanHistory: readonly string[];
};

export function MoveList({ sanHistory }: MoveListProps) {
  if (sanHistory.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucun coup joué.</p>;
  }

  return (
    <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 font-mono text-sm">
      {toMovePairs(sanHistory).map((pair) => (
        <li key={pair.number} className="contents">
          <span className="text-muted-foreground">{pair.number}.</span>
          <span>{pair.white}</span>
          <span>{pair.black ?? ""}</span>
        </li>
      ))}
    </ol>
  );
}
