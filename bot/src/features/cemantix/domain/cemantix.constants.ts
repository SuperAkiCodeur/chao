export const CEMANTIX_CONSTANTS = {
  DEFAULT_EMBED_COLOR: 0xf1c40f,
  TOP_GUESSES_COUNT: 10,
  GAME_HOUR: 10,
  TIMEZONE: "Europe/Paris",
  MAX_WORD_LENGTH: 50,
  // Thresholds applied in order (first match wins)
  TEMPERATURES: [
    { minScore: 80, label: "🌋 Brûlant !" },
    { minScore: 65, label: "🔥🔥 Très chaud !" },
    { minScore: 50, label: "🔥 Chaud" },
    { minScore: 35, label: "🌡️ Tiède" },
    { minScore: 20, label: "❄️ Froid" },
    { minScore: 0, label: "🧊 Glacial" },
  ],
  COHERE_MODEL: "embed-multilingual-v3.0",
  SIMILARITY_TIMEOUT_MS: 15_000,
} as const;
