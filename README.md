# ♟️ ChessMate

Application web pour progresser aux échecs : tu joues contre un bot Stockfish et un coach IA
commente la partie. Il ne donne jamais le coup : il met en évidence la zone à surveiller, pose
des questions et explique pourquoi un coup est bon ou dangereux.

> Projet en cours — V1 (MVP) en développement.

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · chess.js · react-chessboard ·
Stockfish WASM · API Claude · PostgreSQL (Neon) · Prisma · Vercel

## Démarrer

Prérequis : Node 22+ et pnpm (`corepack enable` ou `npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env.local   # puis remplir les valeurs
pnpm dev
```

L'app tourne sur http://localhost:3000.

## Scripts

| Commande            | Rôle                                 |
| ------------------- | ------------------------------------ |
| `pnpm dev`          | Serveur de développement             |
| `pnpm build`        | Build de production                  |
| `pnpm lint`         | ESLint                               |
| `pnpm format`       | Formatage Prettier                   |
| `pnpm format:check` | Vérifie le formatage (utilisé en CI) |
| `pnpm typecheck`    | Vérification TypeScript              |
| `pnpm test`         | Tests unitaires Vitest               |

## Workflow

Une issue par tâche → branche `feat/…` depuis `main` → PR avec `Closes #n` → CI (lint,
formatage, types, tests, build) + preview Vercel → merge manuel. Détails dans
[CLAUDE.md](./CLAUDE.md).

## Licence

À définir. Stockfish est distribué sous GPLv3.
