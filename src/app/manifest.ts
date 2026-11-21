import type { MetadataRoute } from "next";

/**
 * Fiche d'identité de l'application (manifeste PWA) : ce que le téléphone affiche quand on
 * ajoute ChessMate à l'écran d'accueil. Pas de mode hors ligne (décision de Mat : l'intérêt
 * de l'app, c'est le coach, qui a besoin du réseau).
 *
 * Couleurs en hexadécimal : le manifeste ne lit pas les variables CSS ; ce sont les valeurs
 * des tokens `noyer` et `or` de docs/design-system.md.
 */
export const THEME_COLOR = "#3b2a1e"; // noyer
export const BACKGROUND_COLOR = "#3b2a1e"; // noyer

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChessMate — ton coach d'échecs",
    short_name: "ChessMate",
    description:
      "Joue contre un bot et progresse avec un coach qui te fait réfléchir au lieu de te donner le coup.",
    lang: "fr",
    start_url: "/jouer",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
