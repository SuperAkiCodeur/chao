// Steam Store unofficial API (public, no key required)

export type SteamSearchItem = {
  id: number;
  name: string;
  tiny_image: string;
  price?: {
    currency: string;
    initial: number;            // centimes
    final: number;              // centimes (après promo)
    discount_percent: number;
    initial_formatted: string;
    final_formatted: string;
  };
};

export type SteamPriceOverview = {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  initial_formatted: string;
  final_formatted: string;
};

export type SteamAppDetails = {
  steam_appid: number;
  name: string;
  header_image: string;
  is_free: boolean;
  price_overview?: SteamPriceOverview;
};

export async function searchSteamGames(query: string): Promise<SteamSearchItem[]> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&cc=fr&l=french&num_per_page=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return [];
    const data = await res.json() as { total: number; items: SteamSearchItem[] };
    return data.items?.slice(0, 10) ?? [];
  } catch {
    return [];
  }
}

export async function getSteamAppDetails(appId: number): Promise<SteamAppDetails | null> {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=french`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const raw = await res.json() as Record<string, { success: boolean; data: SteamAppDetails }>;
    const entry = raw[String(appId)];
    if (!entry?.success) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function formatEur(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export function getSteamUrl(appId: number): string {
  return `https://store.steampowered.com/app/${appId}`;
}
