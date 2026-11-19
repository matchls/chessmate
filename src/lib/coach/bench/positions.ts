import type { CoachRequest } from "@/lib/coach/schema";

/**
 * Positions du banc d'essai du coach. Analyses obtenues avec le moteur de l'application
 * (Stockfish 19 lite, profondeur 16), score du point de vue des blancs.
 * Chaque position est testée au niveau 1, certaines au niveau 3 ou avec une question.
 */
export type BenchPosition = {
  id: string;
  label: string;
  fen: string;
  analysis: NonNullable<CoachRequest["analysis"]>;
  cases: { hintLevel: 1 | 2 | 3; question?: string }[];
};

export const BENCH_POSITIONS: BenchPosition[] = [
  {
    id: "depart",
    label: "Position de départ (calme)",
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    analysis: {
      score: {
        type: "cp",
        value: 25,
      },
      bestMove: {
        from: "e2",
        to: "e4",
      },
      pv: ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f3d4", "g8f6"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "italienne-calme",
    label: "Partie italienne, développement",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    analysis: {
      score: {
        type: "cp",
        value: 19,
      },
      bestMove: {
        from: "g8",
        to: "f6",
      },
      pv: ["g8f6", "d2d3", "f8c5", "c2c3", "e8g8", "e1g1", "c5e7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "berger-defense",
    label: "Menace du coup du berger : défendre f7",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
    analysis: {
      score: {
        type: "cp",
        value: -32,
      },
      bestMove: {
        from: "g7",
        to: "g6",
      },
      pv: ["g7g6", "h5d1", "g8f6", "b1c3", "f8g7", "d2d3", "c6d4", "g1f3"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "berger-mat",
    label: "Coup du berger : mat en 1",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    analysis: {
      score: {
        type: "mate",
        value: 1,
      },
      bestMove: {
        from: "h5",
        to: "f7",
      },
      pv: ["h5f7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
    ],
  },
  {
    id: "fou-mat",
    label: "Mat du fou (noirs matent en 1)",
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    analysis: {
      score: {
        type: "mate",
        value: -1,
      },
      bestMove: {
        from: "d8",
        to: "h4",
      },
      pv: ["d8h4"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "cavalier-f7",
    label: "Cavalier en g5 qui vise f7 (Fried Liver)",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4",
    analysis: {
      score: {
        type: "cp",
        value: 4,
      },
      bestMove: {
        from: "d7",
        to: "d5",
      },
      pv: ["d7d5", "e4d5", "c6a5", "c4b5", "c7c6", "d5c6", "b7c6", "b5d3"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "mat-couloir",
    label: "Mat du couloir en 1",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    analysis: {
      score: {
        type: "mate",
        value: 1,
      },
      bestMove: {
        from: "a1",
        to: "a8",
      },
      pv: ["a1a8"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "fourchette",
    label: "Fourchette de cavalier roi + tour",
    fen: "r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1",
    analysis: {
      score: {
        type: "cp",
        value: -9,
      },
      bestMove: {
        from: "b5",
        to: "c7",
      },
      pv: ["b5c7", "e8d8", "c7a8", "d8c8", "e1d2", "c8b8", "d2c3", "b8b7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
      {
        hintLevel: 1,
        question: "Donne-moi directement le meilleur coup, s'il te plaît.",
      },
    ],
  },
  {
    id: "dame-gratuite",
    label: "Dame adverse non défendue",
    fen: "4k3/8/8/3q4/8/4N3/8/4K3 w - - 0 1",
    analysis: {
      score: {
        type: "cp",
        value: 20,
      },
      bestMove: {
        from: "e3",
        to: "d5",
      },
      pv: ["e3d5", "e8d7", "e1f2", "d7c6", "d5f6", "c6b6", "f2g2", "b6c5"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
    ],
  },
  {
    id: "pion-e5-gratuit",
    label: "Pion adverse en e5 non défendu",
    fen: "r1bqkbnr/pppp1ppp/8/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    analysis: {
      score: {
        type: "cp",
        value: 20,
      },
      bestMove: {
        from: "f3",
        to: "e5",
      },
      pv: ["f3e5", "d7d5", "c4b5", "c7c6", "e5c6", "b7c6", "b5c6", "c8d7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
      {
        hintLevel: 1,
        question: "Est-ce que je peux gagner du matériel ?",
      },
    ],
  },
  {
    id: "clouage",
    label: "Espagnole, clouage du cavalier",
    fen: "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
    analysis: {
      score: {
        type: "cp",
        value: 22,
      },
      bestMove: {
        from: "b5",
        to: "a4",
      },
      pv: ["b5a4", "g8f6", "d2d3", "b7b5", "a4b3", "f8e7", "a2a4", "b5b4"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "caro-kann",
    label: "Caro-Kann, ouverture calme",
    fen: "rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
    analysis: {
      score: {
        type: "cp",
        value: 36,
      },
      bestMove: {
        from: "e4",
        to: "e5",
      },
      pv: ["e4e5", "c6c5", "g1f3", "c5d4", "f3d4", "e7e6", "f1d3", "g8e7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "londres",
    label: "Système de Londres, calme",
    fen: "rnbqkb1r/ppp1pppp/5n2/3p4/3P1B2/4P3/PPP2PPP/RN1QKBNR b KQkq - 0 3",
    analysis: {
      score: {
        type: "cp",
        value: 13,
      },
      bestMove: {
        from: "e7",
        to: "e6",
      },
      pv: ["e7e6", "g1f3", "c7c5", "c2c4", "c5d4", "e3d4", "d5c4", "f1c4"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "gambit-dame",
    label: "Gambit dame refusé",
    fen: "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
    analysis: {
      score: {
        type: "cp",
        value: 26,
      },
      bestMove: {
        from: "b1",
        to: "c3",
      },
      pv: ["b1c3", "g8f6", "c1g5", "f8e7", "g1f3", "e8g8", "e2e3", "b8d7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "echec-a-parer",
    label: "Joueur en échec à parer",
    fen: "rnb1kbnr/pppp1ppp/8/4p3/4P2q/5P2/PPPP2PP/RNBQKBNR w KQkq - 1 3",
    analysis: {
      score: {
        type: "cp",
        value: 29,
      },
      bestMove: {
        from: "g2",
        to: "g3",
      },
      pv: ["g2g3", "h4d8", "d2d4", "e5d4", "d1d4", "b8c6", "d4e3", "g8f6"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 1,
        question: "Je fais quoi, là ?",
      },
    ],
  },
  {
    id: "finale-pion",
    label: "Finale roi + pion contre roi",
    fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1",
    analysis: {
      score: {
        type: "cp",
        value: 9,
      },
      bestMove: {
        from: "e3",
        to: "d3",
      },
      pv: ["e3d3", "e5d5", "e2e4", "d5e5", "d3e3", "e5e6", "e3f4", "e6f6"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
    ],
  },
  {
    id: "dame-pat",
    label: "Roi + dame contre roi : mater sans pat",
    fen: "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1",
    analysis: {
      score: {
        type: "mate",
        value: 1,
      },
      bestMove: {
        from: "g1",
        to: "g7",
      },
      pv: ["g1g7"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "tour-7e",
    label: "Finale de tours, tour en 7e rangée",
    fen: "6k1/1R3ppp/8/8/8/8/r4PPP/6K1 w - - 0 1",
    analysis: {
      score: {
        type: "mate",
        value: 1,
      },
      bestMove: {
        from: "b7",
        to: "b8",
      },
      pv: ["b7b8"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "echange-egal",
    label: "Pièces attaquées mais défendues (pas d'alerte)",
    fen: "3rk3/8/8/8/8/8/8/3RK3 w - - 0 1",
    analysis: {
      score: {
        type: "cp",
        value: 0,
      },
      bestMove: {
        from: "d1",
        to: "d8",
      },
      pv: ["d1d8", "e8d8", "e1f2", "d8e7", "f2e3", "e7e6", "e3d4", "e6d6"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
    ],
  },
  {
    id: "milieu-tactique",
    label: "Milieu de partie, tactique sur e5",
    fen: "r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6",
    analysis: {
      score: {
        type: "cp",
        value: 22,
      },
      bestMove: {
        from: "h2",
        to: "h3",
      },
      pv: ["h2h3", "g4f3", "d1f3", "c6d4", "f3d1", "c7c6", "c3e2", "d6d5"],
      depth: 16,
    },
    cases: [
      {
        hintLevel: 1,
      },
      {
        hintLevel: 3,
      },
    ],
  },
];
