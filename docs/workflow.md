# Méthode de travail : de l'issue à la fusion

## Vue d'ensemble

```txt
Issue → Plan simple → Feu vert de Mat → Branche → Code + tests → pnpm check
      → PR avec « Résumé pour Mat » → CI verte + relecture automatique → corrections
      → Fusion selon le tableau « Qui fusionne quoi »
```

**Une seule issue à la fois**, de bout en bout, avant de passer à la suivante.
Jamais plusieurs PR ouvertes en parallèle.

## 1. L'issue

Créée avec le modèle `.github/ISSUE_TEMPLATE/feature.md` (ou `bug.md`). Elle contient des
**critères d'acceptation testables** : c'est ce qui dit quand le travail est fini.
Elle est rattachée à un milestone (`V1 — MVP`, puis `V1.1`, `V2`) et porte des labels
(`feature`, `chore`, `bug`, `engine`, `coach`, `ui`, `backend`).

## 2. Le plan, avant toute ligne de code

Claude Code poste ce plan (dans la conversation ou en commentaire de l'issue) et
**attend le feu vert** :

```markdown
## Plan pour l'issue #12 — <titre>

**Objectif en une phrase :**
**Fichiers touchés :** chemin → rôle en quelques mots
**Comment ils communiquent :** 2 ou 3 lignes, sans jargon
**Tests prévus :**
**Concepts nouveaux :** avec une analogie
**Dépendances à ajouter :** (à valider par Mat)
**Questions ou choix à trancher :**
```

Si Mat pose une question sur le plan, on y répond **avant** de coder.

## 3. Branche et code

- Branche depuis `main`, nommée d'après l'issue : `feat/12-echiquier`, `fix/…`, `chore/…`.
- Commits au format `type(scope): description` (ex. `feat(board): add promotion dialog`).
- Logique métier dans `src/lib` sous forme de fonctions pures, avec un `*.test.ts` à côté.

## 4. Le contrôle local : hook Git

Un hook Git est un petit script que Git lance automatiquement à un moment précis.
Ici, **avant chaque envoi vers GitHub** (`pre-push`), il lance `pnpm check` (formatage, lint,
types, tests, build). Si quelque chose échoue, l'envoi est refusé. Installé avec Husky.
On ne le contourne jamais (`--no-verify`) sans demande explicite de Mat.

## 5. La PR

- Créée avec `.github/pull_request_template.md`.
- **« Résumé pour Mat »** en tête : 5 lignes, en français, sans jargon non expliqué.
- `Closes #12` pour fermer l'issue automatiquement à la fusion.
- Lien vers la preview Vercel (créée automatiquement pour chaque PR).

## 6. La boucle avec le relecteur

1. La CI se lance : formatage, lint, types, tests, build.
2. **Un Claude relecteur** (`.github/workflows/relecture.yml`) analyse la PR depuis GitHub
   Actions et commente sur les lignes concernées. Il utilise un **modèle différent** (Opus) de
   celui qui écrit (Sonnet) et n'a pas vu le code s'écrire.
   Analogie : le plan est relu par un collègue qui n'était pas à l'établi.
3. Claude Code lit les remarques, corrige et repousse. **Trois allers-retours maximum** :
   au-delà, il s'arrête et prévient Mat.
4. **Contre-vérification** : le relecteur ne relit pas une PR qu'il a déjà commentée. Après
   chaque série de corrections, Claude Code écrit dans la PR
   `@claude vérifie que ces corrections règlent les remarques, sans rien casser`, et attend la
   réponse. Pas de fusion automatique sans une réponse favorable.
5. Une remarque est **« ouverte »** tant qu'elle n'est ni corrigée, ni écartée avec une raison
   écrite en réponse dans la PR.

## 7. Qui fusionne quoi

| Type de PR                                                                                                                   | Fusion                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Logique entièrement couverte par des tests (`src/lib` : Elo, wrapper Stockfish, validation des réponses du coach)            | Automatique : CI verte + relecture sans remarque ouverte                             |
| Écrans (échiquier, panneau du coach, historique), hors connexion                                                             | Automatique : CI verte + relecture sans remarque ouverte. Mat teste ensuite par lots |
| Connexion et comptes, base de données et migrations, infra (CI, workflows, Vercel, réglages Claude Code), route `/api/coach` | **Mat, toujours.** Claude Code s'arrête et attend                                    |
| Tout le reste                                                                                                                | Mat, sur demande explicite                                                           |

Quand Mat demande « fusionne la PR #12 », Claude Code vérifie d'abord `gh pr checks 12` :

- tout est vert → `gh pr merge 12 --squash --delete-branch` ;
- quelque chose est rouge ou en cours → il refuse, dit quoi en une phrase et propose la suite.

La route `/api/coach` est dans « Mat, toujours » parce qu'elle porte les clés d'API, la limite de
requêtes et donc la facture.

## 8. Après la fusion

- L'issue se ferme automatiquement et la barre de progression du milestone avance sur GitHub.
- Notion (fiche ChessMate) est mis à jour à la fin de chaque milestone, sur demande de Mat.
- On passe à l'issue suivante.

## Les bugs

1. Issue avec le modèle `bug.md` : ce qui se passe, ce qui devrait se passer, comment reproduire.
2. Un test qui échoue et reproduit le bug.
3. La correction, qui fait passer le test.

## Les outils de la boucle

- **Relecteur** (`.github/workflows/relecture.yml`) : se lance **une seule fois par PR**, à
  l'ouverture (ou quand elle sort du brouillon), en parallèle de la CI. Il ne se relance pas
  quand on pousse des corrections : la contre-vérification passe par `@claude`. Il ne relit
  pas les PR qui ne touchent que des fichiers Markdown, ni celles qu'il juge triviales. Il ne valide ni ne bloque : c'est un avis, la règle de fusion reste le tableau.
- **`@claude`** (`.github/workflows/claude.yml`) : écrire un commentaire contenant `@claude`
  dans une PR ou une issue, par exemple « @claude explique-moi ce fichier ». Pratique depuis le
  téléphone.
- **Réglages Claude Code** (`.claude/settings.json`, valables pour toute session dans le dépôt) :
  - Sonnet pour écrire, Opus pour relire en CI ; style de sortie « Proactive ».
  - Autorisé sans demander : fichiers du projet, `pnpm`, `git`, `gh`.
  - Interdit : lire les fichiers `.env`, `git push --force`, pousser sur `main`, `--no-verify`,
    `rm -rf` hors du projet.
  - À demander à chaque fois : `ssh`, `scp`, migrations Prisma.
  - Limite : une interdiction porte sur la commande telle qu'elle est écrite ; une variante
    détournée peut passer. Ces règles sont un garde-fou, pas une garantie : les vraies
    protections restent le hook Git, la CI et la relecture.
  - Les approbations personnelles (« ne plus demander ») vont dans `.claude/settings.local.json`,
    qui n'est pas envoyé sur GitHub.
- Les relectures et `@claude` sont décomptés de l'abonnement Claude de Mat (secret
  `CLAUDE_CODE_OAUTH_TOKEN`). Opus atteint plus vite les limites d'usage.

## Le dépôt

- **Public** (`matchls/chessmate`) : minutes GitHub Actions illimitées, protection de `main`
  possible (PR obligatoire + CI verte), à activer dans Settings → Branches.
- Si le dépôt passe en privé sur un compte gratuit, la protection de `main` disparaît : le hook
  Git et la règle de fusion ci-dessus la remplacent.
