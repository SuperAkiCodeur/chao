import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";

const HF_API_URL = `https://api-inference.huggingface.co/models/${CEMANTIX_CONSTANTS.HF_MODEL}`;

// ---------------------------------------------------------------------------
// In-memory embedding cache — cleared at each new game
// ---------------------------------------------------------------------------

const embeddingCache = new Map<string, number[]>();

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

// ---------------------------------------------------------------------------
// Embedding fetch
// ---------------------------------------------------------------------------

async function fetchEmbedding(word: string): Promise<number[]> {
  const cached = embeddingCache.get(word);

  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CEMANTIX_CONSTANTS.SIMILARITY_TIMEOUT_MS,
  );

  let response: Response;

  try {
    response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        ...(env.HUGGINGFACE_API_KEY ? { Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}` } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: word,
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`HuggingFace API error ${response.status}: ${body}`);
  }

  const data = await response.json() as number[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Unexpected HuggingFace response format for word "${word}"`);
  }

  embeddingCache.set(word, data);
  return data;
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

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a score between 0 and 100.
 * 100 means semantically identical, 0 means no relation.
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
  // Clamp to [0, 100] — cosine can be slightly negative for unrelated words
  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
}

/**
 * Pre-warms the embedding for the secret word so that
 * the first player's guess doesn't pay the cold-start penalty.
 */
export async function preWarmSecretEmbedding(secretWord: string): Promise<void> {
  try {
    await fetchEmbedding(secretWord);
    logger.info("[cemantix] Secret word embedding pre-warmed");
  } catch (error) {
    logger.warn("[cemantix] Failed to pre-warm secret word embedding", { error });
  }
}
