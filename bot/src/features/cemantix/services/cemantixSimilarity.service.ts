import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";

const COHERE_EMBED_URL = "https://api.cohere.com/v2/embed";

// ---------------------------------------------------------------------------
// In-memory embedding cache — cleared at each new game
// ---------------------------------------------------------------------------

const embeddingCache = new Map<string, number[]>();

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause ? `${error.message} — cause: ${String(cause)}` : error.message;
  }
  return String(error);
}

// ---------------------------------------------------------------------------
// Embedding fetch
// ---------------------------------------------------------------------------

async function fetchEmbedding(word: string): Promise<number[]> {
  const cached = embeddingCache.get(word);
  if (cached) return cached;

  if (!env.COHERE_API_KEY) {
    throw new Error("COHERE_API_KEY n'est pas configuré dans .env");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CEMANTIX_CONSTANTS.SIMILARITY_TIMEOUT_MS,
  );

  let response: Response;

  try {
    response = await fetch(COHERE_EMBED_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        texts: [word],
        model: CEMANTIX_CONSTANTS.COHERE_MODEL,
        input_type: "search_query",
        embedding_types: ["float"],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`Cohere API ${response.status}: ${body}`);
  }

  const raw = (await response.json()) as {
    embeddings?: { float?: number[][] };
  };

  const embedding = raw?.embeddings?.float?.[0];

  if (!embedding || embedding.length === 0) {
    throw new Error(
      `Unexpected Cohere response shape: ${JSON.stringify(raw).slice(0, 120)}`,
    );
  }

  embeddingCache.set(word, embedding);
  return embedding;
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a score between 0 and 100.
 * 100 = same word, 0 = no semantic relation.
 */
export async function computeSimilarityScore(
  word: string,
  secretWord: string,
): Promise<number> {
  const [embWord, embSecret] = await Promise.all([
    fetchEmbedding(word),
    fetchEmbedding(secretWord),
  ]);

  const similarity = cosineSimilarity(embWord, embSecret);
  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
}

export async function preWarmSecretEmbedding(secretWord: string): Promise<void> {
  try {
    await fetchEmbedding(secretWord);
    logger.info("[cemantix] Secret word embedding pre-warmed");
  } catch (error) {
    logger.warn("[cemantix] Failed to pre-warm secret word embedding", {
      error: serializeError(error),
    });
  }
}

export { serializeError };
