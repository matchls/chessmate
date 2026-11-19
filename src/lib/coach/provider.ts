import type { ChatMessage } from "@/lib/coach/prompt";

/**
 * Interface `LLMProvider` : une seule « prise » pour tous les fournisseurs compatibles avec le
 * format de requête d'OpenAI (Groq, Mistral, Ollama…). Changer de fournisseur = changer de
 * réglages (URL, clé, modèle), pas de code.
 */
export interface LLMProvider {
  readonly name: ProviderName;
  readonly model: string;
  /** Envoie la conversation et renvoie le texte brut de la réponse (attendu : du JSON). */
  complete(messages: ChatMessage[]): Promise<string>;
}

export type ProviderName = "groq" | "mistral";

type ProviderConfig = {
  baseUrl: string;
  keyVariable: string;
  defaultModel: string;
  /** Paramètres propres au fournisseur, ajoutés à chaque requête. */
  extraBody: Record<string, unknown>;
};

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    keyVariable: "GROQ_API_KEY",
    defaultModel: "openai/gpt-oss-120b",
    // Les modèles gpt-oss « réfléchissent » avant de répondre : on limite cet effort pour
    // garder un temps de réponse compatible avec une partie en direct.
    extraBody: { reasoning_effort: "low" },
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    keyVariable: "MISTRAL_API_KEY",
    defaultModel: "ministral-8b-latest",
    extraBody: {},
  },
};

export const DEFAULT_PROVIDER: ProviderName = "groq";
const TIMEOUT_MS = 15_000;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Fournisseur absent de la configuration (clé manquante) : le coach est indisponible. */
export class ProviderNotConfiguredError extends Error {
  constructor(variable: string) {
    super(`Variable d'environnement manquante : ${variable}`);
    this.name = "ProviderNotConfiguredError";
  }
}

type Env = Record<string, string | undefined>;

export function createProvider(
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): LLMProvider {
  const requested = env.COACH_PROVIDER ?? DEFAULT_PROVIDER;
  if (!(requested in PROVIDERS)) {
    throw new ProviderError(`Fournisseur inconnu : ${requested}`);
  }
  const name = requested as ProviderName;
  const config = PROVIDERS[name];
  const apiKey = env[config.keyVariable];
  if (!apiKey) throw new ProviderNotConfiguredError(config.keyVariable);
  const model = env.COACH_MODEL || config.defaultModel;

  return {
    name,
    model,
    async complete(messages) {
      let response: Response;
      try {
        response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.4,
            max_tokens: 1024,
            response_format: { type: "json_object" },
            ...config.extraBody,
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        throw new ProviderError(
          `Fournisseur injoignable : ${(error as Error).message}`,
        );
      }

      if (!response.ok) {
        throw new ProviderError(
          `Réponse ${response.status} du fournisseur`,
          response.status,
        );
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string | null } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new ProviderError("Réponse vide du fournisseur");
      return content;
    },
  };
}
