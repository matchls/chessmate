# Design system ChessMate

Ambiance : vieille université anglaise, bibliothèque, beau bois, or vieilli. Sobre, chaleureux,
lisible.

- **Planche visuelle** : page [`/design-system`](../src/app/design-system/page.tsx) de l'appli
  (vrais tokens et vrais composants).
- **Tokens dans le code** : [`src/app/globals.css`](../src/app/globals.css), qui est la source de
  vérité. Si une valeur diffère entre ce document et le CSS, c'est le CSS qui fait foi, et on
  corrige ce document.

## 1. Principes

- **L'échiquier d'abord** : le plateau est toujours l'élément le plus lisible de l'écran ; le décor
  reste en retrait (fond flouté, assombri).
- **Chaleur, pas surcharge** : bois et or en accents, jamais partout.
- **Lisibilité** : contraste WCAG AA minimum (≥ 4,5 pour le texte courant) sur tout texte.
- **Thèmes interchangeables** : plateau, pièces et fond sont des thèmes, pour préparer les
  récompenses à débloquer.

## 2. Couleurs

### Bois et papier

| Token         | Classe Tailwind  | Valeur    | Rôle                              |
| ------------- | ---------------- | --------- | --------------------------------- |
| `noyer`       | `bg-noyer`       | `#3B2A1E` | fond de page, cadres              |
| `noyer-clair` | `bg-noyer-clair` | `#5A4231` | survols, bordures sur fond sombre |
| `parchemin`   | `bg-parchemin`   | `#F3E9D2` | cartes, panneaux, zones de texte  |
| `encre`       | `text-encre`     | `#2B1D14` | texte sur parchemin               |

### Couleurs d'accent et nuances

Chaque couleur d'accent a 5 nuances : `100` (très clair), `300`, base, `700`, `900` (très foncé).

| Couleur          | 100       | 300       | Base      | 700       | 900       | Rôle                         |
| ---------------- | --------- | --------- | --------- | --------- | --------- | ---------------------------- |
| `or`             | `#F0E9DF` | `#DAC8B0` | `#B59260` | `#886E48` | `#5A4930` | couleur principale, titres   |
| `bordeaux`       | `#E4D2D5` | `#BC8F95` | `#7A1F2B` | `#5C1720` | `#3D1016` | actions importantes, erreurs |
| `vert-bouteille` | `#D5DFD8` | `#97AE9C` | `#2F5D3A` | `#23462C` | `#182E1D` | réussites, bons coups        |

### Règles de contraste

- **Sur fond noyer** (la page) : texte en `parchemin`, `or`, ou en nuances **300** pour le
  bordeaux et le vert. Le bordeaux et le vert de base y sont illisibles (contrastes 1,3 et 1,8).
- **Sur fond parchemin** (cartes, fenêtres) : texte en `encre`, ou en couleur de **base** pour le
  bordeaux et le vert. L'or de base y est trop clair pour du texte (2,6) : utiliser `or-700` ou
  `or-900`.
- L'or a été éclairci de `#B08D57` à `#B59260` pour passer de 4,42 à 4,72 sur le noyer.

### Branchement sur shadcn/ui

Les composants shadcn utilisent des variables qui portent un **rôle** (fond, principal, erreur…).
On branche la palette dessus, et tous les composants prennent la DA sans modifier leur code.

| Variable shadcn                      | Sur la page (fond sombre) | Dans une carte (fond clair) |
| ------------------------------------ | ------------------------- | --------------------------- |
| `--background`                       | noyer                     | parchemin                   |
| `--foreground`                       | parchemin                 | encre                       |
| `--card` / `--popover`               | parchemin                 | parchemin                   |
| `--primary` / `--primary-foreground` | or / noyer                | or / noyer                  |
| `--secondary`, `--muted`, `--accent` | noyer-clair               | or-100                      |
| `--muted-foreground`                 | `#C5B9A5`                 | `#635649`                   |
| `--destructive`                      | bordeaux-300              | bordeaux                    |
| `--success` (ajoutée)                | vert-bouteille-300        | vert-bouteille              |
| `--border` / `--input`               | noyer-clair               | or-300                      |
| `--ring`                             | or                        | or-700                      |

Les surfaces claires sont repérées en CSS par `[data-slot="card"]`, `[data-slot="dialog-content"]`
et la classe `.surface-parchemin` (pour un panneau clair qui n'est pas une `Card`).

**Un seul thème** : pas de mode sombre automatique. Le variant `dark:` ne s'active qu'avec une
classe `.dark`, qu'on n'utilise pas. Ne pas écrire de classes `dark:`.

## 3. Typographie

- **Titres** (`h1`, `h2`, `h3`, `font-heading`) : Cormorant Garamond, graisses 500 à 700.
- **Texte et interface** (`font-sans`) : Inter.
- **Notation des coups** (`font-mono`) : Geist Mono.
- Polices chargées par `next/font/google` dans `src/app/layout.tsx` (hébergées par le site, aucune
  requête vers Google depuis le navigateur). Licence OFL : usage commercial autorisé.
- Échelle : celle de Tailwind. Titre de page `text-4xl` à `text-5xl`, section `text-3xl`,
  sous-titre `text-xl`, texte `text-base`, secondaire `text-sm`.

## 4. Espacements

Échelle par défaut de Tailwind (multiples de 4 px). Pas de valeurs arbitraires (`p-[13px]`).

## 5. Arrondis

Coins discrets, presque droits : `--radius: 0.25rem` (4 px). Pas de pilules sauf exception
justifiée.

## 6. Ombres

Ombres douces teintées de brun plutôt que noires :

- `shadow-carte` : léger, pour les cartes ;
- `shadow-plateau` : marqué, pour les modales et le plateau.

## 7. Composants

Partir des composants shadcn/ui (`src/components/ui/`) et les habiller **uniquement via les
tokens**. Ne pas modifier leurs classes pour changer une couleur.

| Composant           | Rendu                                                      |
| ------------------- | ---------------------------------------------------------- |
| Bouton principal    | `<Button>` : fond or, texte noyer                          |
| Bouton contour      | `<Button variant="outline">`                               |
| Bouton danger       | `<Button variant="destructive">`                           |
| Carte               | `<Card className="shadow-carte">` : parchemin, texte encre |
| Bulle du coach      | carte parchemin avec liseré or (`border-l-4 border-l-or`)  |
| Message de réussite | `text-success`                                             |
| Message d'erreur    | `text-destructive`                                         |

Chaque composant documente ses états : normal, survol, focus, désactivé, chargement.

## 8. Échiquier et thèmes

- **Fond** : image fixe (bibliothèque ou salle d'étude), floutée et assombrie.
- **Plateau** : texture bois (cases claires et foncées), cadre plus sombre, coordonnées en or.
- **Pièces** : style Staunton classique, lisible en petit.
- **Thème** = plateau + pièces + fond, sauvegardé par joueur.
- ⚠️ Vérifier la licence de chaque jeu de pièces et de chaque image (usage commercial).

## 9. Ajouter ou modifier un composant

1. Utiliser les tokens (`bg-noyer`, `text-or`, `text-success`…), **jamais de couleur en dur**
   (`#…`, `rgb(…)`, `text-red-600`…).
2. Vérifier le contraste du texte selon la surface (sombre ou claire, voir § 2).
3. Ajouter le composant et ses états à la page `/design-system`.
4. Si une règle change, mettre à jour ce document dans la même PR.
