import { describe, expect, it } from "vitest";
import {
  COACH_COLOR,
  COACH_SQUARE,
  coachArrows,
  coachSquareStyles,
  mergeSquareStyles,
} from "./overlay";

describe("overlay du coach", () => {
  it("transforme les cases en styles de contour", () => {
    expect(coachSquareStyles(["e4", "d5"])).toEqual({
      e4: COACH_SQUARE,
      d5: COACH_SQUARE,
    });
    expect(coachSquareStyles([])).toEqual({});
  });

  it("transforme les flèches au format de l'échiquier", () => {
    expect(coachArrows([{ from: "a6", to: "b5" }])).toEqual([
      { startSquare: "a6", endSquare: "b5", color: COACH_COLOR },
    ]);
  });

  it("une case à la fois dernier coup et case du coach garde les deux marquages", () => {
    const merged = mergeSquareStyles(
      { e4: { backgroundColor: "yellow" }, e2: { backgroundColor: "yellow" } },
      coachSquareStyles(["e4", "d4"]),
    );
    expect(merged.e4).toEqual({ backgroundColor: "yellow", ...COACH_SQUARE });
    expect(merged.e2).toEqual({ backgroundColor: "yellow" });
    expect(merged.d4).toEqual(COACH_SQUARE);
  });
});
