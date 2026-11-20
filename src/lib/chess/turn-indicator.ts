import { statusLabel, type Color, type GameStatus } from "@/lib/chess/game";

/**
 * Ce que l'indicateur de trait affiche : à qui c'est de jouer, dit en clair (pas seulement
 * par une couleur), ou le résultat quand la partie est finie.
 */
export type TurnIndicator = {
  /** Couleur de la pastille : camp au trait, ou gagnant ; null pour une nulle. */
  tone: Color | null;
  /** Texte principal : « À toi de jouer », « Le bot réfléchit… », résultat… */
  label: string;
  /** Précision lisible sans la couleur, par exemple « Trait aux blancs ». */
  detail?: string;
  /** Vrai pendant que le bot calcule : la pastille pulse doucement. */
  thinking: boolean;
  /** Partie finie : le résultat est mis en avant. */
  over: boolean;
};

const COLOR_NAME: Record<Color, string> = { w: "blancs", b: "noirs" };

export function turnIndicator({
  status,
  mode,
  playerColor,
  awaitingDecision = false,
}: {
  status: GameStatus;
  mode: "bot" | "local";
  /** Camp du joueur contre le bot (ignoré à deux). */
  playerColor: Color;
  /** Seconde chance proposée : le bot attend la décision du joueur. */
  awaitingDecision?: boolean;
}): TurnIndicator {
  if (status.kind !== "playing") {
    return {
      tone: status.kind === "draw" ? null : status.winner,
      label: statusLabel(status),
      thinking: false,
      over: true,
    };
  }

  const check = status.check ? "Échec ! " : "";
  const detail = `Trait aux ${COLOR_NAME[status.turn]}`;
  if (mode === "local") {
    return {
      tone: status.turn,
      label: `${check}Aux ${COLOR_NAME[status.turn]} de jouer`,
      thinking: false,
      over: false,
    };
  }
  if (status.turn === playerColor) {
    return {
      tone: status.turn,
      label: `${check}À toi de jouer`,
      detail,
      thinking: false,
      over: false,
    };
  }
  if (awaitingDecision) {
    return {
      tone: playerColor,
      label: "Décide : rejouer ou continuer",
      detail: "Le bot attend ta décision",
      thinking: false,
      over: false,
    };
  }
  return {
    tone: status.turn,
    label: `${check}Le bot réfléchit…`,
    detail,
    thinking: true,
    over: false,
  };
}
