import { describe, expect, it } from "vitest";
import type { ExplainResponse } from "./schema";
import {
  canExplain,
  explainHeading,
  explanationView,
  explanationVisuals,
  moverOf,
  whyLabel,
  type Explanation,
} from "./explain-session";

describe("qui peut demander « Pourquoi ? »", () => {
  it("seulement les coups signalés du joueur, jamais ceux du bot", () => {
    const base = { playerColor: "w" as const };
    expect(canExplain({ ...base, moveIndex: 2, moveClass: "blunder" })).toBe(
      true,
    );
    expect(canExplain({ ...base, moveIndex: 3, moveClass: "blunder" })).toBe(
      false,
    );
    expect(canExplain({ ...base, moveIndex: 2, moveClass: "good" })).toBe(
      false,
    );
    expect(canExplain({ ...base, moveIndex: 2, moveClass: undefined })).toBe(
      false,
    );
    expect(
      canExplain({
        playerColor: "b",
        moveIndex: 3,
        moveClass: "mistake",
      }),
    ).toBe(true);
  });
});

describe("textes", () => {
  it("le camp, le titre et le bouton", () => {
    expect(moverOf(0)).toBe("w");
    expect(moverOf(5)).toBe("b");
    expect(explainHeading(6, "Qf3", "inaccuracy")).toBe("4. Qf3?!");
    expect(explainHeading(5, "Nf6", "blunder")).toBe("3… Nf6??");
    expect(whyLabel("blunder")).toBe("Pourquoi est-ce une gaffe ?");
    expect(whyLabel("mistake")).toBe("Pourquoi est-ce une erreur ?");
  });
});

describe("échiquier pendant l'explication", () => {
  const response = (step: "why" | "solution"): ExplainResponse => ({
    message: step,
    highlights: [],
    arrows: [],
    step,
    board: step === "why" ? "after" : "before",
  });
  const base: Explanation = {
    moveIndex: 4,
    total: 9,
    step: "why",
    loading: false,
    error: null,
    why: response("why"),
  };

  it("« pourquoi » : position d'après le coup ; « solution » : position d'avant", () => {
    expect(explanationView(base)).toBe(5);
    expect(explanationVisuals(base)?.step).toBe("why");
    const solution = {
      ...base,
      step: "solution" as const,
      solution: response("solution"),
    };
    expect(explanationView(solution)).toBe(4);
    expect(explanationVisuals(solution)?.step).toBe("solution");
  });
});
