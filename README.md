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
| `pnpm check`        | Toutes les vérifications de la CI    |

## Workflow

Une issue par tâche → plan validé → branche `feat/…` depuis `main` → PR avec `Closes #n` →
CI (formatage, lint, types, tests, build) + relecture automatique par Claude + preview Vercel →
fusion selon les règles de [docs/workflow.md](./docs/workflow.md). Un hook Git lance
`pnpm check` avant chaque `git push`.

## Licence

À définir. Stockfish est distribué sous GPLv3.
