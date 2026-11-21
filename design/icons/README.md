# Icônes de l'application (provisoires)

Cavalier noyer sur fond or (variante « C », choisie par Mat le 21/11), en attendant un logo
travaillé. Sources SVG ici ; fichiers servis :

| Fichier                              | Source              | Usage                                  |
| ------------------------------------ | ------------------- | -------------------------------------- |
| `src/app/icon.svg`                   | (lui-même)          | onglet du navigateur                   |
| `src/app/favicon.ico`                | `src/app/icon.svg`  | anciens navigateurs (16, 32, 48 px)    |
| `src/app/apple-icon.png`             | `icon-square.svg`   | iPhone (carré plein, iOS arrondit)     |
| `public/icons/icon-192.png`, `-512`  | `src/app/icon.svg`  | Android, écran d'accueil               |
| `public/icons/icon-maskable-512.png` | `icon-maskable.svg` | Android, forme découpée par le système |

Régénérer après une modification (rsvg-convert et ImageMagick) :

```bash
rsvg-convert -w 192 -h 192 src/app/icon.svg -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 src/app/icon.svg -o public/icons/icon-512.png
rsvg-convert -w 512 -h 512 design/icons/icon-maskable.svg -o public/icons/icon-maskable-512.png
rsvg-convert -w 180 -h 180 design/icons/icon-square.svg -o src/app/apple-icon.png
```
