import { env } from "../../../core/config/env.js";
import { CINEMA_CONSTANTS } from "../domain/cinema.constants.js";
import type {
  TmdbCredits,
  TmdbDetails,
  TmdbMedia,
  TmdbSearchResult,
  CinemaContentType,
} from "../domain/cinema.types.js";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

function buildSearchUrl(type: CinemaContentType, title: string): string {
  return `${TMDB_API_BASE_URL}/search/${type}?api_key=${env.TMDB_API_KEY}&query=${encodeURIComponent(
    title,
  )}&language=fr-FR&include_adult=false`;
}

function buildDetailsUrl(type: CinemaContentType, mediaId: string): string {
  return `${TMDB_API_BASE_URL}/${type}/${mediaId}?api_key=${env.TMDB_API_KEY}&language=fr-FR`;
}

function buildCreditsUrl(type: CinemaContentType, mediaId: string): string {
  return `${TMDB_API_BASE_URL}/${type}/${mediaId}/credits?api_key=${env.TMDB_API_KEY}&language=fr-FR`;
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
  type: CinemaContentType,
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
  type: CinemaContentType,
  fallbackTitle: string,
  details: TmdbDetails,
  bestMatch?: TmdbSearchResult,
): string {
  if (type === CINEMA_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.title ?? bestMatch?.title ?? fallbackTitle;
  }

  return details.name ?? bestMatch?.name ?? fallbackTitle;
}

export function resolveTmdbReleaseDate(
  type: CinemaContentType,
  details: TmdbDetails,
): string | null {
  if (type === CINEMA_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.release_date ?? null;
  }

  return details.first_air_date ?? null;
}

export function resolveTmdbRuntime(
  type: CinemaContentType,
  details: TmdbDetails,
): number | null {
  if (type === CINEMA_CONSTANTS.MEDIA_TYPES.MOVIE) {
    return details.runtime ?? null;
  }

  return details.episode_run_time?.[0] ?? null;
}

export function resolveTmdbAuthor(
  type: CinemaContentType,
  details: TmdbDetails,
  credits: TmdbCredits,
): { label: string; value: string } {
  if (type === CINEMA_CONSTANTS.MEDIA_TYPES.MOVIE) {
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

  return `${CINEMA_CONSTANTS.TMDB_POSTER_BASE_URL}${posterPath}`;
}

export async function fetchTmdbPosterUrl(
  type: CinemaContentType,
  mediaId: string,
): Promise<string | null> {
  try {
    const details = await fetchJson<TmdbDetails>(buildDetailsUrl(type, mediaId));
    return buildTmdbPosterUrl(details.poster_path);
  } catch {
    return null;
  }
}