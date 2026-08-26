export type TmdbResult = {
  mediaId: string;
  resolvedTitle: string;
  posterUrl: string | null;
  overview: string | null;
  genres: string[];
  releaseDate: string | null;
  runtime: string | null;
  director: string | null;
};

export type TmdbSearchResponse =
  | { ok: true; result: TmdbResult }
  | { ok: false; error: string };
