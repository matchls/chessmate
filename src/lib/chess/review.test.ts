import { describe, expect, it } from "vitest";
import {
  isReviewing,
  keyToAction,
  navigate,
  reviewLabel,
  shownCount,
  viewAfterMove,
} from "./review";

const HISTORY = ["e4", "e6", "c3", "c5", "Na3", "Nf6", "Qf3"];
const TOTAL = HISTORY.length;

describe("revue des coups", () => {
  it("le direct affiche tous les coups", () => {
    expect(shownCount(null, TOTAL)).toBe(TOTAL);
    expect(isReviewing(null, TOTAL)).toBe(false);
  });

  it("précédent, puis suivant, revient au direct", () => {
    const back = navigate(null, TOTAL, "prev");
    expect(back).toBe(TOTAL - 1);
    expect(isReviewing(back, TOTAL)).toBe(true);
    expect(navigate(back, TOTAL, "next")).toBeNull();
  });

  it("premier et dernier", () => {
    expect(navigate(null, TOTAL, "first")).toBe(0);
    expect(navigate(3, TOTAL, "last")).toBeNull();
  });

  it("ne sort jamais des bornes", () => {
    expect(navigate(0, TOTAL, "prev")).toBe(0);
    expect(navigate(null, TOTAL, "next")).toBeNull();
  });

  it("partie vide : rien à revoir", () => {
    expect(navigate(null, 0, "prev")).toBeNull();
    expect(navigate(null, 0, "first")).toBeNull();
    expect(isReviewing(navigate(null, 0, "first"), 0)).toBe(false);
  });

  it("clic sur un coup : position juste après ce coup ; le dernier coup = le direct", () => {
    expect(viewAfterMove(0, TOTAL)).toBe(1);
    expect(viewAfterMove(3, TOTAL)).toBe(4);
    expect(viewAfterMove(TOTAL - 1, TOTAL)).toBeNull();
  });

  it("flèches du clavier", () => {
    expect(keyToAction("ArrowLeft")).toBe("prev");
    expect(keyToAction("ArrowRight")).toBe("next");
    expect(keyToAction("Home")).toBe("first");
    expect(keyToAction("End")).toBe("last");
    expect(keyToAction("a")).toBeNull();
  });

  it("texte du bandeau : coup des blancs, coup des noirs, position de départ", () => {
    expect(reviewLabel(HISTORY, 7)).toBe("Tu regardes le coup 4. Qf3");
    expect(reviewLabel(HISTORY, 6)).toBe("Tu regardes le coup 3… Nf6");
    expect(reviewLabel(HISTORY, 0)).toBe("Tu regardes la position de départ");
  });
});
