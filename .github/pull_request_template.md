## Résumé pour Mat

<!-- 5 lignes maximum, en français. Tout acronyme ou terme technique est expliqué. -->

**Ce qui a été fait :**
**Pourquoi :** issue #
**Où :** fichier → rôle
**En une image :** <!-- analogie, si un concept est nouveau ; sinon « rien de nouveau » -->
**À vérifier par toi :**
**Aperçu :** <!-- lien de la preview Vercel -->

Closes #

---

## Détails techniques

### Changements

### Tests ajoutés

### Points d'attention ou risques

## Checklist

- [ ] `pnpm check` passe en local
- [ ] Les tests couvrent le changement (logique dans `src/lib` testée avec Vitest)
- [ ] Aucun secret dans le code ni dans une variable `NEXT_PUBLIC_*` (elle finit dans le navigateur)
- [ ] Nouvelle variable d'environnement ajoutée à `.env.example`
- [ ] Réponses du coach validées côté serveur (si la route `/api/coach` est touchée)
- [ ] Testé sur la preview Vercel (desktop + mobile si écran)
- [ ] `CLAUDE.md` et `docs/` à jour si une règle a changé
