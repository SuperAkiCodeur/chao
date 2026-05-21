export const WATCH_CONSTANTS = {
  COMMAND_NAME: "watch",
  TICKET_EMOJI: "🎟️",
  TMDB_POSTER_BASE_URL: "https://image.tmdb.org/t/p/w500",
  DEFAULT_EMBED_COLOR: 0xe91e63,
  ACTIVE_STATUS: "active",
  ENDED_STATUS: "ended",
  STORAGE_FILE_NAME: "watchParties.json",
  RATING_DURATION_MS: 60 * 60 * 1000,
  RATING_EMOJIS: {
    1: "1️⃣",
    2: "2️⃣",
    3: "3️⃣",
    4: "4️⃣",
    5: "5️⃣",
  },
  MEDIA_TYPES: {
    MOVIE: "movie",
    TV: "tv",
  },
} as const;