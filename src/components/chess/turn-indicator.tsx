import type { TurnIndicator as Indicator } from "@/lib/chess/turn-indicator";

const TONE_CLASS = {
  w: "bg-parchemin border-encre",
  b: "bg-encre border-parchemin",
  draw: "bg-or border-parchemin",
} as const;

/**
 * Pastille aux couleurs du camp au trait (ou du gagnant), suivie du texte en clair :
 * l'information ne repose jamais sur la seule couleur.
 */
export function TurnIndicator({ indicator }: { indicator: Indicator }) {
  const tone = indicator.tone ?? "draw";
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3">
      <span
        aria-hidden
        className={`size-5 shrink-0 rounded-full border-2 ${TONE_CLASS[tone]} ${
          indicator.thinking ? "animate-pulse" : ""
        }`}
      />
      <div className="flex flex-col">
        <p
          className={
            indicator.over ? "text-lg font-semibold" : "text-base font-medium"
          }
        >
          {indicator.label}
        </p>
        {indicator.detail && (
          <p className="text-muted-foreground text-sm">{indicator.detail}</p>
        )}
      </div>
    </div>
  );
}
