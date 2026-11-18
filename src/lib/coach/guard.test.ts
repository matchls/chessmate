import { describe, expect, it } from "vitest";
import { bestMoveSpellings, guardReply, messageLeaksMove } from "./guard";

// Fourchette de cavalier : le meilleur coup est Cb5-c7+ (Nc7+).
const FORK_FEN = "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1";
const BEST = { from: "b5", to: "c7" } as const;
const context = { fen: FORK_FEN, hintLevel: 2 as const, bestMove: BEST };

const reply = (value: unknown) => JSON.stringify(value);

describe("bestMoveSpellings", () => {
  it("donne la notation anglaise, française et machine du coup", () => {
    expect(bestMoveSpellings(FORK_FEN, BEST).sort()).toEqual(
      ["Cc7", "Nc7", "b5c7"].sort(),
    );
  });
});

describe("messageLeaksMove", () => {
  it("repère le coup écrit en notation, même avec échec ou en minuscules", () => {
    expect(messageLeaksMove("Joue Nc7+ !", FORK_FEN, BEST)).toBe(true);
    expect(messageLeaksMove("pense à cc7", FORK_FEN, BEST)).toBe(true);
    expect(messageLeaksMove("le coup b5c7 gagne", FORK_FEN, BEST)).toBe(true);
  });

  it("repère le coup décrit par ses cases de départ et d'arrivée", () => {
    expect(
      messageLeaksMove("Ton cavalier en b5 peut aller en c7.", FORK_FEN, BEST),
    ).toBe(true);
  });

  it("laisse passer un vrai indice", () => {
    expect(
      messageLeaksMove(
        "Ton cavalier en b5 a peut-être un rôle à jouer. Que vise-t-il ?",
        FORK_FEN,
        BEST,
      ),
    ).toBe(false);
    expect(
      messageLeaksMove("Regarde le roi et la tour adverses.", FORK_FEN, BEST),
    ).toBe(false);
  });

  it("ne confond pas une case avec un morceau de mot plus long", () => {
    expect(
      messageLeaksMove("la colonne b5c7x n'existe pas", FORK_FEN, BEST),
    ).toBe(false);
  });
});

describe("guardReply", () => {
  it("laisse passer une bonne réponse", () => {
    const result = guardReply(
      reply({
        message:
          "Regarde où sont le roi et la tour adverses. Qu'ont-ils en commun ?",
        highlights: ["e8", "a8"],
        arrows: [],
      }),
      context,
    );
    expect(result).toMatchObject({
      highlights: ["e8", "a8"],
      arrows: [],
      hintLevel: 2,
      issues: [],
    });
  });

  it("accepte une réponse entourée d'un bloc ```json", () => {
    const result = guardReply(
      "```json\n" + reply({ message: "Une question ?" }) + "\n```",
      context,
    );
    expect(result.issues).toEqual([]);
    expect(result.message).toBe("Une question ?");
  });

  it("remplace une réponse illisible ou hors format par une réponse de secours", () => {
    expect(guardReply("pas du JSON", context).issues).toEqual(["invalid-json"]);
    expect(guardReply(reply({ texte: "oups" }), context).issues).toEqual([
      "invalid-shape",
    ]);
    expect(guardReply("pas du JSON", context).message.length).toBeGreaterThan(
      20,
    );
  });

  it("bloque un message qui révèle le coup", () => {
    const result = guardReply(
      reply({ message: "Joue Nc7+ et gagne la tour !" }),
      context,
    );
    expect(result.issues).toEqual(["leak-message"]);
    expect(result.message).not.toContain("c7");
  });

  it("retire la flèche qui montre le coup, garde une flèche de menace cohérente", () => {
    const result = guardReply(
      reply({
        message: "Quelles pièces adverses sont alignées ?",
        arrows: [
          { from: "b5", to: "c7" },
          { from: "a8", to: "a1" },
        ],
      }),
      context,
    );
    expect(result.arrows).toEqual([{ from: "a8", to: "a1" }]);
    expect(result.issues).toEqual(["leak-arrow"]);
  });

  it("retire les cases inexistantes et les flèches incohérentes", () => {
    const result = guardReply(
      reply({
        message: "Une question ?",
        highlights: ["e8", "z9", "e8"],
        arrows: [
          { from: "d4", to: "d5" }, // aucune pièce en d4
          { from: "b5", to: "b6" }, // un cavalier ne va pas en b6
        ],
      }),
      context,
    );
    expect(result.highlights).toEqual(["e8"]);
    expect(result.arrows).toEqual([]);
    expect(result.issues).toEqual([
      "dropped-highlight",
      "dropped-highlight",
      "dropped-arrow",
      "dropped-arrow",
    ]);
  });

  it("limite le nombre de cases et de flèches", () => {
    const result = guardReply(
      reply({
        message: "Regarde.",
        highlights: ["a1", "a2", "a3", "a4", "a5", "a6"],
      }),
      { fen: FORK_FEN, hintLevel: 1 },
    );
    expect(result.highlights).toHaveLength(4);
  });
});
