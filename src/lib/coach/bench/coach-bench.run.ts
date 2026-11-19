import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { askCoach } from "@/lib/coach/coach";
import { createProvider, ProviderError } from "@/lib/coach/provider";
import { coachRequestSchema } from "@/lib/coach/schema";
import { BENCH_POSITIONS } from "./positions";

/**
 * Banc d'essai du coach : interroge le vrai modèle sur les positions types et écrit un rapport
 * dans `tmp/` (ignoré par Git). À lancer à la main : `pnpm coach:bench`.
 * Nécessite la clé du fournisseur dans `.env.local` (GROQ_API_KEY par défaut).
 * Modèles testés : variable BENCH_MODELS (séparés par des virgules).
 */

// Charge la clé du fournisseur depuis .env.local, comme le ferait Next.js.
try {
  process.loadEnvFile(".env.local");
} catch {
  // Pas de .env.local : on garde les variables d'environnement déjà définies.
}

const MODELS = (
  process.env.BENCH_MODELS ?? "openai/gpt-oss-20b,openai/gpt-oss-120b"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
// Offre gratuite : on espace les requêtes pour rester sous la limite par minute, et on réessaie
// une fois après une erreur 429 (limite atteinte).
const PAUSE_MS = Number(process.env.BENCH_PAUSE_MS ?? 8000);
const RETRY_AFTER_429_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const cell = (text: string) =>
  text.replaceAll("|", "\\|").replaceAll("\n", " ");

test(
  "banc d'essai du coach",
  async () => {
    mkdirSync("tmp", { recursive: true });

    for (const model of MODELS) {
      const provider = createProvider({ ...process.env, COACH_MODEL: model });
      const rows: string[] = [];
      const latencies: number[] = [];
      let leaks = 0;
      let invalid = 0;
      let errors = 0;
      let withQuestion = 0;
      let answered = 0;
      let templates = 0;

      for (const position of BENCH_POSITIONS) {
        for (const benchCase of position.cases) {
          const request = coachRequestSchema.parse({
            fen: position.fen,
            analysis: position.analysis,
            ...benchCase,
          });
          let calledModel = false;
          const label = `${position.label} (niv. ${benchCase.hintLevel}${benchCase.question ? ", question" : ""})`;
          try {
            const ask = () =>
              askCoach(request, () => {
                calledModel = true;
                return provider;
              });
            const result = await ask().catch(async (error: unknown) => {
              if (error instanceof ProviderError && error.status === 429) {
                await sleep(RETRY_AFTER_429_MS);
                return ask();
              }
              throw error;
            });
            if (result.source === "model") latencies.push(result.latencyMs);
            else templates += 1;
            answered += 1;
            if (result.message.trim().endsWith("?")) withQuestion += 1;
            if (result.issues.some((issue) => issue.startsWith("leak")))
              leaks += 1;
            if (result.issues.some((issue) => issue.startsWith("invalid")))
              invalid += 1;
            const visuals = [
              result.highlights.length
                ? `cases ${result.highlights.join(" ")}`
                : "",
              result.arrows.length
                ? `flèches ${result.arrows.map((a) => `${a.from}→${a.to}`).join(" ")}`
                : "",
            ]
              .filter(Boolean)
              .join(", ");
            rows.push(
              `| ${cell(label)} | ${result.source === "template" ? "gabarit" : result.latencyMs} | ${result.issues.join(", ") || "—"} | ${cell(result.message)} | ${visuals || "—"} | |`,
            );
          } catch (error) {
            errors += 1;
            rows.push(
              `| ${cell(label)} | — | erreur | ${cell((error as Error).message)} | — | |`,
            );
          }
          // Pause seulement après un appel au modèle (les gabarits ne coûtent rien).
          if (calledModel) await sleep(PAUSE_MS);
        }
      }

      const sorted = [...latencies].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
      const report = [
        `# Banc d'essai du coach : ${model}`,
        "",
        `Date : ${new Date().toISOString()} · fournisseur : ${provider.name} · ${rows.length} cas`,
        "",
        `- Temps de réponse du modèle : médiane ${median} ms, 90 % sous ${p90} ms`,
        `- Indices écrits par le code (gabarits, niveaux 1 et 2) : ${templates} ; par le modèle : ${answered - templates}`,
        `- Coup révélé (bloqué par le garde-fou) : ${leaks}`,
        `- Réponses illisibles (remplacées) : ${invalid}`,
        `- Messages qui finissent par une question : ${withQuestion} sur ${answered}`,
        `- Erreurs du fournisseur : ${errors}`,
        "",
        "Colonne « Note » à remplir à la main : exactitude échiquéenne et pédagogie, de 0 à 2 chacune.",
        "",
        "| Cas | ms | Garde-fou | Message | Visuels | Note |",
        "| --- | --- | --- | --- | --- | --- |",
        ...rows,
        "",
      ].join("\n");
      const file = `tmp/coach-bench-${model.replaceAll("/", "_")}.md`;
      writeFileSync(file, report);
      console.log(
        `Rapport écrit : ${file} (médiane ${median} ms, fuites bloquées ${leaks}, erreurs ${errors})`,
      );
    }
  },
  60 * 60 * 1000,
);
