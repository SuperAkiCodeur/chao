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
// Helpers
// ---------------------------------------------------------------------------

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause ? `${error.message} — cause: ${String(cause)}` : error.message;
  }
  return String(error);
}

/**
 * Flattens the HuggingFace response into a 1-D embedding vector.
 * The API may return:
 *   - number[]      → already flat (rare for sentence-transformers)
 *   - number[][]    → [[...embedding...]]  ← most common
 *   - number[][][]  → [[[token1], [token2], ...]] (token-level, unlikely here)
 */
function extractEmbedding(data: unknown): number[] {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Empty or non-array response: ${JSON.stringify(data).slice(0, 120)}`);
  }

  // number[][] → take first row
  if (Array.isArray(data[0])) {
    const inner = data[0];
    if (!Array.isArray(inner) || inner.length === 0) {
      throw new Error(`Nested array is empty: ${JSON.stringify(data).slice(0, 120)}`);
    }
    // number[][][] → take first token of first row
    if (Array.isArray(inner[0])) {
      return inner[0] as number[];
    }
    return inner as number[];
  }

  // Already flat number[]
  if (typeof data[0] === "number") {
    return data as number[];
  }

  throw new Error(`Unrecognised embedding shape: ${JSON.stringify(data).slice(0, 120)}`);
}

// ---------------------------------------------------------------------------
// Embedding fetch
// ---------------------------------------------------------------------------

async function fetchEmbedding(word: string): Promise<number[]> {
  const cached = embeddingCache.get(word);
  if (cached) return cached;

  if (!env.HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY n'est pas configuré dans .env");
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
        Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
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
    throw new Error(`HuggingFace ${response.status}: ${body}`);
  }

  const raw = await response.json();
  const embedding = extractEmbedding(raw);

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
