import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import {
  bestMoveSpellings,
  guardReply,
  leakingHighlights,
  messageLeaksMove,
} from "./guard";

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

  it("repère la pièce nommée avec sa case d'arrivée (« ta dame … f7 »)", () => {
    const fen =
      "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";
    const mateMove = { from: "h5", to: "f7" } as const;
    expect(
      messageLeaksMove("Utilise ta dame pour viser f7 ?", fen, mateMove),
    ).toBe(true);
    expect(
      messageLeaksMove("La case f7 est-elle bien défendue ?", fen, mateMove),
    ).toBe(false);
    expect(
      messageLeaksMove("Ta dame est très active, non ?", fen, mateMove),
    ).toBe(false);
  });

  it("repère une prise écrite sans le « x » (Ce5 pour Cxe5)", () => {
    const fen =
      "r1bqkbnr/pppp1ppp/8/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";
    expect(
      messageLeaksMove("Pense à Ce5 !", fen, { from: "f3", to: "e5" }),
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

describe("leakingHighlights", () => {
  const fork = new Chess(FORK_FEN);
  // Dame adverse non défendue : le meilleur coup Ce3xd5 est une prise.
  const capture = new Chess("4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1");
  const takeQueen = { from: "e3", to: "d5" } as const;

  it("niveau 1 : ni la pièce à jouer, ni sa case d'arrivée", () => {
    expect(leakingHighlights(["b5", "c7", "e8"], fork, BEST, 1)).toEqual([
      "b5",
      "c7",
    ]);
  });

  it("niveaux 2 et 3 : la pièce à jouer oui, une case d'arrivée vide jamais", () => {
    expect(leakingHighlights(["b5"], fork, BEST, 2)).toEqual([]);
    expect(leakingHighlights(["b5", "c7"], fork, BEST, 3)).toEqual(["c7"]);
  });

  it("niveaux 2 et 3 : la pièce à prendre oui, mais pas avec la pièce qui prend", () => {
    expect(leakingHighlights(["d5"], capture, takeQueen, 2)).toEqual([]);
    expect(leakingHighlights(["e3", "d5"], capture, takeQueen, 3)).toEqual([
      "d5",
    ]);
  });

  it("guardReply retire ces cases et le signale", () => {
    const result = guardReply(
      reply({
        message: "Regarde autour de ton cavalier ?",
        highlights: ["b5", "c7"],
      }),
      { fen: FORK_FEN, hintLevel: 1, bestMove: BEST },
    );
    expect(result.highlights).toEqual([]);
    expect(result.issues).toEqual(["leak-highlight", "leak-highlight"]);
  });
});
