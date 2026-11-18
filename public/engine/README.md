# Moteur d'échecs Stockfish

Fichiers copiés tels quels depuis le paquet npm [`stockfish`](https://www.npmjs.com/package/stockfish)
(projet [stockfish.js](https://github.com/nmrugg/stockfish.js) de Nathan Rugg), version **19.0.1**,
variante **lite single-threaded** : réseau de neurones réduit, un seul fil d'exécution, aucun
en-tête HTTP particulier nécessaire (pas de COOP/COEP).

| Fichier                         | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `stockfish-19-lite-single.js`   | `ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a` |
| `stockfish-19-lite-single.wasm` | `ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de` |

## Licence

Stockfish est distribué sous licence **GNU GPL v3** (texte complet : `COPYING.txt`).
Code source : [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish) et,
pour la version WebAssembly, [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js).
Le moteur tourne dans un Web Worker séparé et dialogue avec l'application par le protocole UCI.

## Mettre à jour

```bash
npm pack stockfish@<version>
tar -xzf stockfish-<version>.tgz package/bin/stockfish-<major>-lite-single.js \
  package/bin/stockfish-<major>-lite-single.wasm package/Copying.txt
```

Copier les deux fichiers ici, renommer `Copying.txt` en `COPYING.txt`, mettre à jour ce tableau
et la constante `STOCKFISH_URL` de `src/lib/engine/engine.ts`.
