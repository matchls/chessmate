import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  "Tu joues contre un bot à ton niveau.",
  "Tu demandes un indice quand tu bloques.",
  "Le coach te montre où regarder et te pose une question, sans jamais donner le coup.",
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 p-4 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Progresse en réfléchissant
        </h1>
        <p className="text-muted-foreground max-w-md text-balance">
          Joue contre un bot et progresse avec un coach qui te fait réfléchir,
          sans jamais te donner le coup.
        </p>
      </div>

      <Card className="w-full max-w-md text-left">
        <CardHeader>
          <CardTitle>Comment ça marche</CardTitle>
          <CardDescription>
            Partie contre le bot et coach : bientôt disponibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Link href="/jouer" className={buttonVariants({ size: "lg" })}>
        Nouvelle partie
      </Link>
    </main>
  );
}
