import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";
import "./globals.css";

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
        GeistSans.variable,
        GeistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
            <span className="text-lg font-semibold tracking-tight">
              ChessMate
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
