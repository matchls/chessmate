import type { Metadata } from "next";
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
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
            <span className="font-heading text-or text-2xl font-semibold">
              ChessMate
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
