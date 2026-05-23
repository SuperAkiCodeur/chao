export const WATCH_CONSTANTS = {
  COMMAND_NAME: "watch",
  TICKET_BUTTON_ID: "watch:ticket",
  RATING_BUTTON_PREFIX: "watch:rating:",
  TMDB_POSTER_BASE_URL: "https://image.tmdb.org/t/p/w500",
  DEFAULT_EMBED_COLOR: 0xe91e63,
  ACTIVE_STATUS: "active",
  ENDED_STATUS: "ended",
  RATING_DURATION_MS: 60 * 60 * 1000,
  MEDIA_TYPES: {
    MOVIE: "movie",
    TV: "tv",
  },
} as const;