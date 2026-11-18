@AGENTS.md

# ChessMate — instructions pour Claude Code

Application web pour progresser aux échecs : partie contre un bot Stockfish, avec un coach IA
(API Claude) qui ne donne jamais le coup à jouer. Il pointe la zone à surveiller, pose des
questions et explique pourquoi un coup est bon ou dangereux.

Fiche projet (roadmap, features) : Notion › DEV HUB › 🚀 Projets › ChessMate.

## Stack

- Next.js 16 (App Router) + TypeScript strict, Tailwind CSS v4, shadcn/ui
- chess.js (règles) + react-chessboard (affichage)
- Stockfish WASM dans un Web Worker : une instance bot, une instance analyse
- API Claude via une route serveur Next.js (clé jamais exposée au client), sortie JSON validée par Zod
- PostgreSQL Neon + Prisma, auth Better Auth (étapes ultérieures)
- Déploiement Vercel (preview par PR)

## Règles

- Gestionnaire de paquets : **pnpm uniquement**.
- Ne pas ajouter de dépendance sans validation.
- Diff minimal, pas de refactor hors périmètre de l'issue.
- Jamais de commit ni de push sans validation explicite ; jamais de push direct sur `main`.
- Jamais de `.env*` (hors `.env.example`) dans un commit.
- Toute variable d'environnement nouvelle est ajoutée à `.env.example`.
- Textes de l'interface et du coach en français.

## Workflow Git

- Une issue GitHub par tâche, rattachée au milestone (V1, V1.1, V2).
- Branche depuis `main` : `feat/…`, `fix/…`, `refactor/…`, `chore/…`, `docs/…`, `test/…`.
- Commits Conventional Commits : `type(scope): description` (ex. `feat(board): add legal move validation`).
- PR avec `Closes #n`, CI verte, preview Vercel vérifiée, merge manuel (squash).

## Vérifications avant de proposer un commit

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

## Structure

```txt
src/
  app/          routes, layouts, route handlers (app/api/*)
  components/   composants React (ui/ = shadcn, chess/ = échiquier, coach/ = panneau coach)
  lib/          logique pure et clients (engine/, coach/, elo…) — testée avec Vitest
  types/        types partagés
```

- La logique métier (Elo, parsing UCI, validation des réponses du coach) vit dans `src/lib` sous
  forme de fonctions pures, avec un fichier `*.test.ts` à côté.
- Les composants restent fins : ils appellent `src/lib`, ils ne contiennent pas la logique.
