# ♟️ ChessMate

Application web pour progresser aux échecs : tu joues contre un bot Stockfish et un coach IA
commente la partie. Il ne donne jamais le coup : il met en évidence la zone à surveiller, pose
des questions et explique pourquoi un coup est bon ou dangereux.

> Projet en cours — V1 (MVP) en développement.

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · chess.js · react-chessboard ·
Stockfish WASM · API Claude · PostgreSQL (Neon) · Prisma · Vercel

## Design system

Couleurs, typographie et composants : [`docs/design-system.md`](docs/design-system.md).
Planche visuelle dans l'appli : page `/design-system` (en local : http://localhost:3000/design-system).

## Démarrer

Prérequis : Node 22+ et pnpm (`corepack enable` ou `npm i -g pnpm`).

```bash
pnpm install
cp .env.example .env.local   # puis remplir les valeurs
pnpm dev
```

L'app tourne sur http://localhost:3000.

### Installer l'app sur son téléphone

ChessMate est une PWA (application web installable) : depuis le site,

- **Android (Chrome)** : menu ⋮ → « Installer l'application » (ou « Ajouter à l'écran d'accueil ») ;
- **iPhone (Safari)** : bouton Partager → « Sur l'écran d'accueil ».

L'app s'ouvre alors en plein écran avec son icône. Pas de mode hors ligne : le coach a besoin du
réseau. Icônes et sources : `design/icons/`.

### Base de données

La partie et le coach marchent sans base. Pour les comptes et l'historique, il faut une base
PostgreSQL Neon : dans `.env.local`, `DATABASE_URL` pointe vers une **branche Neon de
développement**, jamais vers la production. Puis :

```bash
pnpm db:migrate   # applique les migrations sur la base de développement
```

Les comptes (Better Auth) demandent aussi `BETTER_AUTH_SECRET` dans `.env.local` (voir
`.env.example` pour le générer).

Pour modifier le schéma (`prisma/schema.prisma`) : `pnpm db:migrate --name <description>`
crée la migration à committer avec le changement. Sur Vercel, les migrations sont appliquées
au déploiement (`pnpm db:deploy`, dans `vercel-build`).

## Scripts

| Commande            | Rôle                                                   |
| ------------------- | ------------------------------------------------------ |
| `pnpm dev`          | Serveur de développement                               |
| `pnpm build`        | Build de production                                    |
| `pnpm lint`         | ESLint                                                 |
| `pnpm format`       | Formatage Prettier                                     |
| `pnpm format:check` | Vérifie le formatage (utilisé en CI)                   |
| `pnpm typecheck`    | Vérification TypeScript                                |
| `pnpm test`         | Tests unitaires Vitest                                 |
| `pnpm check`        | Toutes les vérifications de la CI                      |
| `pnpm coach:bench`  | Banc d'essai du coach (vraie API, rapport dans `tmp/`) |
| `pnpm db:migrate`   | Crée / applique les migrations (base de développement) |
| `pnpm db:generate`  | Régénère le client Prisma (aussi après `pnpm install`) |

## Workflow

Une issue par tâche → plan validé → branche `feat/…` depuis `main` → PR avec `Closes #n` →
CI (formatage, lint, types, tests, build) + relecture automatique par Claude + preview Vercel →
fusion selon les règles de [docs/workflow.md](./docs/workflow.md). Un hook Git lance
`pnpm check` avant chaque `git push`.

## Licence

À définir pour le code de ChessMate. Le moteur Stockfish (`public/engine/`) est distribué
sous licence GNU GPL v3 : voir [public/engine/README.md](./public/engine/README.md).
