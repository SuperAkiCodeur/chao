// IsThereAnyDeal API v2 — https://docs.isthereanydeal.com/

const ITAD_BASE = "https://api.isthereanydeal.com";

export type ITADGame = {
  id: string;
  slug: string;
  title: string;
};

export type ITADDeal = {
  shop: { id: string; name: string };
  price: { amount: number; amountInt: number; currency: string };
  regular: { amount: number; amountInt: number; currency: string };
  cut: number; // pourcentage de réduction
  url: string;
};

/** Retrouve le jeu ITAD à partir d'un appId Steam. */
export async function lookupITADGame(steamAppId: number, apiKey: string): Promise<ITADGame | null> {
  try {
    const res = await fetch(
      `${ITAD_BASE}/games/lookup/v1?appid=${steamAppId}&shop=steam&key=${apiKey}`,
      { signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return null;
    const data = await res.json() as { game?: ITADGame };
    return data.game ?? null;
  } catch {
    return null;
  }
}

/** Récupère les prix de toutes les boutiques pour un jeu ITAD. */
export async function getITADDeals(itadGameId: string, apiKey: string): Promise<ITADDeal[]> {
  try {
    const res = await fetch(`${ITAD_BASE}/games/prices/v2?country=FR&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([itadGameId]),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { id: string; deals: ITADDeal[] }[];
    return data[0]?.deals ?? [];
  } catch {
    return [];
  }
}
