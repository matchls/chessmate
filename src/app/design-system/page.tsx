import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Check, Flag, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReviewDemo } from "./review-demo";

/*
 * Planche du design system : affiche les vrais tokens et composants de l'appli.
 * Si un token change dans globals.css, cette page change avec lui.
 */

export const metadata: Metadata = {
  title: "Design system — ChessMate",
  robots: { index: false },
};

type Swatch = { token: string; hex: string; className: string };

const neutrals: Swatch[] = [
  { token: "noyer", hex: "#3B2A1E", className: "bg-noyer" },
  { token: "noyer-clair", hex: "#5A4231", className: "bg-noyer-clair" },
  { token: "parchemin", hex: "#F3E9D2", className: "bg-parchemin" },
  { token: "encre", hex: "#2B1D14", className: "bg-encre" },
];

const scales: { name: string; swatches: Swatch[] }[] = [
  {
    name: "Or vieilli — couleur principale",
    swatches: [
      { token: "or-100", hex: "#F0E9DF", className: "bg-or-100" },
      { token: "or-300", hex: "#DAC8B0", className: "bg-or-300" },
      { token: "or", hex: "#B59260", className: "bg-or" },
      { token: "or-700", hex: "#886E48", className: "bg-or-700" },
      { token: "or-900", hex: "#5A4930", className: "bg-or-900" },
    ],
  },
  {
    name: "Bordeaux — actions importantes, erreurs",
    swatches: [
      { token: "bordeaux-100", hex: "#E4D2D5", className: "bg-bordeaux-100" },
      { token: "bordeaux-300", hex: "#BC8F95", className: "bg-bordeaux-300" },
      { token: "bordeaux", hex: "#7A1F2B", className: "bg-bordeaux" },
      { token: "bordeaux-700", hex: "#5C1720", className: "bg-bordeaux-700" },
      { token: "bordeaux-900", hex: "#3D1016", className: "bg-bordeaux-900" },
    ],
  },
  {
    name: "Vert bouteille — réussites, bons coups",
    swatches: [
      {
        token: "vert-bouteille-100",
        hex: "#D5DFD8",
        className: "bg-vert-bouteille-100",
      },
      {
        token: "vert-bouteille-300",
        hex: "#97AE9C",
        className: "bg-vert-bouteille-300",
      },
      {
        token: "vert-bouteille",
        hex: "#2F5D3A",
        className: "bg-vert-bouteille",
      },
      {
        token: "vert-bouteille-700",
        hex: "#23462C",
        className: "bg-vert-bouteille-700",
      },
      {
        token: "vert-bouteille-900",
        hex: "#182E1D",
        className: "bg-vert-bouteille-900",
      },
    ],
  },
];

const buttonVariantSamples = [
  { variant: "default", label: "Principal" },
  { variant: "outline", label: "Contour" },
  { variant: "secondary", label: "Secondaire" },
  { variant: "ghost", label: "Discret" },
  { variant: "destructive", label: "Danger" },
  { variant: "link", label: "Lien" },
] as const;

const buttonSizeSamples = [
  { size: "xs", label: "Très petit" },
  { size: "sm", label: "Petit" },
  { size: "default", label: "Normal" },
  { size: "lg", label: "Grand" },
] as const;

const spacings = [1, 2, 3, 4, 6, 8, 12, 16];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 border-b pb-2">
        <h2 className="text-or text-3xl font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function SwatchTile({ swatch }: { swatch: Swatch }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`${swatch.className} shadow-carte ring-encre/10 h-14 rounded-md ring-1`}
      />
      <div className="flex flex-col">
        <code className="text-xs">{swatch.token}</code>
        <span className="text-muted-foreground font-mono text-xs">
          {swatch.hex}
        </span>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 p-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-5xl font-semibold">Design system</h1>
        <p className="text-muted-foreground max-w-2xl text-balance">
          Les briques visuelles de ChessMate : couleurs, typographie, boutons,
          cartes, arrondis et ombres. Tout ce qui est affiché ici vient des
          vrais tokens et composants de l&apos;appli.
        </p>
      </header>

      <Section
        title="Couleurs"
        description="Nuances 300 : lisibles en texte sur fond noyer. Couleurs de base : lisibles en texte sur parchemin."
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-semibold">Bois et papier</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {neutrals.map((swatch) => (
              <SwatchTile key={swatch.token} swatch={swatch} />
            ))}
          </div>
        </div>
        {scales.map((scale) => (
          <div key={scale.name} className="flex flex-col gap-2">
            <h3 className="text-xl font-semibold">{scale.name}</h3>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
              {scale.swatches.map((swatch) => (
                <SwatchTile key={swatch.token} swatch={swatch} />
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section
        title="Typographie"
        description="Cormorant Garamond pour les titres, Inter pour le texte et l'interface."
      >
        <div className="flex flex-col gap-3">
          <p className="font-heading text-5xl font-semibold">
            Titre de page — text-5xl
          </p>
          <p className="font-heading text-3xl font-semibold">
            Titre de section — text-3xl
          </p>
          <p className="font-heading text-xl font-semibold">
            Sous-titre — text-xl
          </p>
          <p className="max-w-2xl">
            Texte courant en Inter. Le coach ne donne jamais le coup : il montre
            la zone à surveiller et pose une question pour te faire réfléchir.
          </p>
          <p className="text-muted-foreground text-sm">
            Texte secondaire — text-sm, muted-foreground
          </p>
          <p className="font-mono text-sm">1. e4 e5 2. Nf3 Nc6 3. Bb5</p>
        </div>
      </Section>

      <Section
        title="Boutons"
        description="Composant Button de shadcn/ui, habillé uniquement par les tokens."
      >
        <div className="flex flex-wrap items-center gap-3">
          {buttonVariantSamples.map(({ variant, label }) => (
            <Button key={variant} variant={variant}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {buttonSizeSamples.map(({ size, label }) => (
            <Button key={size} size={size}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Lightbulb data-icon="inline-start" />
            Demander un indice
          </Button>
          <Button variant="destructive">
            <Flag data-icon="inline-start" />
            Abandonner
          </Button>
          <Button disabled>Désactivé</Button>
        </div>
      </Section>

      <Section
        title="Cartes"
        description="Fond parchemin, texte encre, ombre légère. Les variables sont redéfinies à l'intérieur pour rester lisibles sur fond clair."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-carte">
            <CardHeader>
              <CardTitle className="text-xl">Carte standard</CardTitle>
              <CardDescription>
                Titre en Cormorant, description en texte secondaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>Contenu de la carte.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-vert-bouteille-100 text-vert-bouteille inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium">
                  <Check className="size-3" />
                  Bon coup
                </span>
                <span className="bg-bordeaux-100 text-bordeaux rounded-sm px-2 py-0.5 text-xs font-medium">
                  Gaffe
                </span>
                <span className="bg-or-100 text-or-900 rounded-sm px-2 py-0.5 text-xs font-medium">
                  Imprécision
                </span>
              </div>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">Valider</Button>
              <Button size="sm" variant="outline">
                Annuler
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-carte border-l-or border-l-4">
            <CardHeader>
              <CardTitle className="text-xl">Bulle du coach</CardTitle>
              <CardDescription>Carte parchemin avec liseré or.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>
                Regarde ta dame : combien de pièces adverses peuvent
                l&apos;attaquer au prochain coup ?
              </p>
              <p className="text-success text-sm font-medium">
                Bien vu, ce coup renforce ton centre.
              </p>
              <p className="text-destructive text-sm font-medium">
                Attention, ce coup laisse ton cavalier sans défense.
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section
        title="Messages sur fond sombre"
        description="Sur le fond noyer, on utilise les nuances 300 pour garder le contraste."
      >
        <div className="flex flex-col gap-2 text-sm font-medium">
          <p className="text-success">Réussite — vert-bouteille-300</p>
          <p className="text-destructive">Erreur — bordeaux-300</p>
          <p className="text-or">Accent — or</p>
        </div>
      </Section>

      <Section
        title="Revue des coups"
        description="Liste des coups cliquable (symboles ?! ? ?? en tokens lisibles sur parchemin) et boutons de navigation, assez grands pour le doigt."
      >
        <ReviewDemo />
      </Section>

      <Section
        title="Espacements"
        description="Échelle par défaut de Tailwind, multiples de 4 px. Pas de valeurs arbitraires."
      >
        <div className="flex flex-col gap-2">
          {spacings.map((step) => (
            <div key={step} className="flex items-center gap-3">
              <code className="w-10 text-xs">{step}</code>
              <div
                className="bg-or h-3 rounded-sm"
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
              <span className="text-muted-foreground font-mono text-xs">
                {step * 4} px
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Arrondis et ombres"
        description="Coins discrets, presque droits. Ombres teintées de brun : légère pour les cartes, marquée pour les modales et le plateau."
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="bg-parchemin text-encre flex h-24 items-center justify-center rounded-sm text-xs">
            rounded-sm
          </div>
          <div className="bg-parchemin text-encre flex h-24 items-center justify-center rounded-lg text-xs">
            rounded-lg
          </div>
          <div className="bg-parchemin text-encre shadow-carte flex h-24 items-center justify-center rounded-lg text-xs">
            shadow-carte
          </div>
          <div className="bg-parchemin text-encre shadow-plateau flex h-24 items-center justify-center rounded-lg text-xs">
            shadow-plateau
          </div>
        </div>
      </Section>
    </main>
  );
}
