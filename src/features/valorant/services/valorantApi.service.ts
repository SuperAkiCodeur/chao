import { env } from "../../../core/config/env.js";
import type {
  HenrikAccount,
  HenrikMatch,
  HenrikMmrData,
} from "../domain/valorant.types.js";

const BASE_URL = "https://api.henrikdev.xyz/valorant";

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ValorantApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ValorantApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

function buildHeaders(): HeadersInit {
  return env.HENRIKDEV_API_KEY ? { Authorization: env.HENRIKDEV_API_KEY } : {};
}

async function fetchHenrik<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; errors?: { message: string }[] };
    const message =
      body.errors?.[0]?.message ??
      body.message ??
      `Erreur HTTP ${response.status}`;

    throw new ValorantApiError(response.status, message);
  }

  const json = await response.json() as { status: number; data: T };

  return json.data;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchValorantAccount(
  name: string,
  tag: string,
): Promise<HenrikAccount> {
  return fetchHenrik<HenrikAccount>(
    `/v1/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
  );
}

export async function fetchValorantMmr(
  region: string,
  name: string,
  tag: string,
): Promise<HenrikMmrData> {
  return fetchHenrik<HenrikMmrData>(
    `/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
  );
}

export async function fetchRecentMatches(
  region: string,
  name: string,
  tag: string,
  size: number,
): Promise<HenrikMatch[]> {
  return fetchHenrik<HenrikMatch[]>(
    `/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=${size}`,
  );
}
