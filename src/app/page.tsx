export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">ChessMate</h1>
      <p className="max-w-md text-balance text-zinc-600 dark:text-zinc-400">
        Joue contre un bot et progresse avec un coach qui te fait réfléchir,
        sans jamais te donner le coup.
      </p>
    </main>
  );
}
