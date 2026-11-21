import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { THEME_COLOR } from "./manifest";
import { GeistMono } from "geist/font/mono";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

/* Polices du design system : Inter pour le texte, Cormorant Garamond pour les titres. */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "ChessMate — ton coach d'échecs",
  description:
    "Joue contre un bot et progresse avec un coach IA qui te fait réfléchir au lieu de te donner le coup.",
  applicationName: "ChessMate",
  // iPhone : ouverture en plein écran depuis l'écran d'accueil, barre d'état sombre au-dessus du
  // contenu (pas sous lui, pour ne pas masquer l'en-tête derrière l'encoche).
  appleWebApp: {
    capable: true,
    title: "ChessMate",
    statusBarStyle: "black",
  },
};

/** Couleur de la barre du navigateur et de la barre d'état (token noyer). */
export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={cn(
        "h-full font-sans antialiased",
        inter.variable,
        cormorant.variable,
        GeistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
            <Link
              href="/"
              className="font-heading text-or text-2xl font-semibold"
            >
              ChessMate
            </Link>
            <Suspense>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
