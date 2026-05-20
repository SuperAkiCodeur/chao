import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import type {
  TmdbCredits,
  TmdbDetails,
  TmdbMedia,
  TmdbSearchResult,
  WatchContentType,
} from "../domain/watch.types.js";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

function getTmdbApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing");
  }

  return apiKey;
}

function buildSearchUrl(type: WatchContentType, title: string): string {
  const apiKey = getTmdbApiKey();

  return `${TMDB_API_BASE_URL}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(
    title,
  )}&language=fr-FR&include_adult=false`;
}

function buildDetailsUrl(type: WatchContentType, mediaId: string): string {
  const apiKey = getTmdbApiKey();

  return `${TMDB_API_BASE_URL}/${type}/${mediaId}?api_key=${apiKey}&language=fr-FR`;
}

function buildCreditsUrl(type: WatchContentType, mediaId: string): string {
  const apiKey = getTmdbApiKey();

  return `${TMDB_API_BASE_URL}/${type}/${mediaId}/credits?api_key=${apiKey}&language=fr-FR`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

type TmdbSearchResponse = {
  results?: TmdbSearchResult[];
};

export async function fetchTmdbMedia(
  type: WatchContentType,
  title: string,
): Promise<TmdbMedia | null> {
  const searchUrl = buildSearchUrl(type, title);
  const searchData = await fetchJson<TmdbSearchResponse>(searchUrl);

  if (!searchData.results?.length) {
    return null;
  }

  const bestMatch = searchData.results[0];
  const mediaId = String(bestMatch.id);

  const [details, credits] = await Promise.all([
    fetchJson<TmdbDetails>(buildDetailsUrl(type, mediaId)),
    fetchJson<TmdbCredits>(buildCreditsUrl(type, mediaId)),
  ]);

  return {
    bestMatch,
    mediaId,
    details,
    credits,
  };
}

export function resolveTmdbTitle(
  type: WatchContentType,
  fallbackTitle: string,
  details: TmdbDetails,
  bestMatch?: TmdbSearchResult,
): string {
  if (type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.title ?? bestMatch?.title ?? fallbackTitle;
  }

  return details.name ?? bestMatch?.name ?? fallbackTitle;
}

export function resolveTmdbReleaseDate(
  type: WatchContentType,
  details: TmdbDetails,
): string | null {
  if (type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.release_date ?? null;
  }

  return details.first_air_date ?? null;
}

export function resolveTmdbRuntime(
  type: WatchContentType,
  details: TmdbDetails,
): number | null {
  if (type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.runtime ?? null;
  }

  return details.episode_run_time?.[0] ?? null;
}

export function resolveTmdbAuthor(
  type: WatchContentType,
  details: TmdbDetails,
  credits: TmdbCredits,
): { label: string; value: string } {
  if (type === WATCH_CONSTANTS.MEDIA_TYPES.MOVIE) {
    const director = credits.crew?.find((person) => person.job === "Director");

    return {
      label: "Réalisateur",
      value: director?.name ?? "Inconnu",
    };
  }

  return {
    label: "Créateur",
    value: details.created_by?.length
      ? details.created_by.map((person) => person.name).join(", ")
      : "Inconnu",
  };
}

export function buildTmdbPosterUrl(posterPath?: string | null): string | null {
  if (!posterPath) {
    return null;
  }

  return `${WATCH_CONSTANTS.TMDB_POSTER_BASE_URL}${posterPath}`;
}