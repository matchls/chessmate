@AGENTS.md

# ChessMate — instructions pour Claude Code

Application web pour progresser aux échecs : partie contre un bot Stockfish, avec un coach IA
qui ne donne jamais le coup à jouer. Il pointe la zone à surveiller, pose des questions et
explique pourquoi un coup est bon ou dangereux.

Fiche projet (roadmap, features) : Notion › DEV HUB › 🚀 Projets › ChessMate.

## Avec qui tu travailles

Mat : développeur fullstack, ancien menuisier. Il doit pouvoir **expliquer chaque choix en
entretien d'embauche**.

- **Parle en français.** Évite le jargon ; définis un terme technique ou un acronyme à sa
  première apparition.
- **Concept nouveau → une analogie simple** (atelier, chantier), puis des étapes courtes.
- **Tâche factuelle** (résultat de tests, état de la CI, liste de fichiers) → réponse directe.
- Mat travaille parfois **depuis son téléphone** : messages courts, l'essentiel en premier.

## Règles d'or (non négociables)

1. **Une issue à la fois**, du plan jusqu'à la fusion. Jamais plusieurs PR ouvertes en parallèle.
2. **Plan avant code.** Présente un plan en langage simple (format dans `docs/workflow.md`) et
   attends le feu vert de Mat avant d'écrire du code.
3. **Fusion selon le tableau « Qui fusionne quoi »** de `docs/workflow.md`. Fusion automatique
   uniquement pour la logique entièrement testée et les écrans hors connexion, avec CI verte et
   relecture sans remarque ouverte. **Jamais de fusion sans Mat** sur la connexion, la base de
   données et les migrations, l'infra et la route `/api/coach`.
4. **Trois allers-retours maximum avec le relecteur.** Au-delà, arrête-toi et préviens Mat.
5. **Pas de nouvelle dépendance ni de changement de stack sans accord de Mat.**
6. **Secrets** : uniquement dans les variables d'environnement du serveur. Rien de sensible dans
   une variable `NEXT_PUBLIC_*` (elle finit dans le navigateur). Jamais de `.env*` dans un commit
   (hors `.env.example`) ; toute nouvelle variable est ajoutée à `.env.example`.
7. **Le serveur ne fait jamais confiance au client** : entrées validées par Zod, réponses du coach
   revérifiées (cases et flèches cohérentes avec la position) avant d'être renvoyées.
8. **Ne contourne jamais le hook Git** (`--no-verify`) ; jamais de push direct sur `main`.
9. Diff minimal, pas de refactor hors périmètre de l'issue. Textes de l'interface et du coach en
   français.

## Stack

- Next.js 16 (App Router) + TypeScript strict, Tailwind CSS v4, shadcn/ui
- chess.js (règles) + react-chessboard (affichage)
- Stockfish WASM dans un Web Worker (côté navigateur) : une instance bot, une instance analyse
- Coach : route serveur `/api/coach` + interface `LLMProvider` (fournisseur choisi par
  `COACH_PROVIDER`) ; Groq gratuit en local et sur les previews (`openai/gpt-oss-120b`), production
  à décider ; extracteur de faits (`src/lib/coach/facts.ts`) ; garde-fou (`guard.ts`) ;
  sortie JSON validée par Zod
- PostgreSQL Neon + Prisma, auth Better Auth (étapes ultérieures)
- Gestionnaire de paquets : **pnpm uniquement**
- Déploiement Vercel (preview par PR) ; CI GitHub Actions ; relecture automatique par Claude

## Workflow (détails : `docs/workflow.md`)

```txt
Issue → plan → feu vert → branche → code + tests → pnpm check → PR (« Résumé pour Mat »)
      → CI + relecteur → corrections (3 max) → fusion selon le tableau
```

- Branche depuis `main` : `feat/12-…`, `fix/…`, `refactor/…`, `chore/…`, `docs/…`, `test/…`.
- Commits Conventional Commits : `type(scope): description`.
- PR avec le modèle `.github/pull_request_template.md`, `Closes #n` et le lien de preview Vercel.
- Après des corrections suite au relecteur : commenter
  `@claude vérifie que ces corrections règlent les remarques, sans rien casser`.

## Commandes

- `pnpm install` — installe les dépendances (et le hook Git via Husky)
- `pnpm dev` — serveur de développement sur http://localhost:3000
- `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`
- `pnpm format` — remet le code en forme ; `pnpm format:check` vérifie sans modifier
- `pnpm check` — tout ce que fait la CI ; lancé automatiquement avant chaque push
- `pnpm coach:bench` — banc d'essai du coach sur 20 positions (vraie API, clé dans `.env.local`), rapport dans `tmp/`

## Structure

```txt
src/
  app/          routes, layouts, route handlers (app/api/*)
  components/   composants React (ui/ = shadcn, chess/ = échiquier, coach/ = panneau coach)
  lib/          logique pure et clients (engine/, coach/, elo…) — testée avec Vitest
  types/        types partagés
docs/           documentation (workflow.md)
```

- La logique métier (Elo, parsing UCI, validation des réponses du coach) vit dans `src/lib` sous
  forme de fonctions pures, avec un fichier `*.test.ts` à côté.
- Les composants restent fins : ils appellent `src/lib`, ils ne contiennent pas la logique.

## Où trouver quoi

| Besoin                                      | Fichier                  |
| ------------------------------------------- | ------------------------ |
| Issue → plan → PR → fusion, qui fusionne    | `docs/workflow.md`       |
| Modèle, style et permissions de Claude Code | `.claude/settings.json`  |
| Roadmap et features                         | Notion (fiche ChessMate) |
