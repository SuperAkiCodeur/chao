export const ROULETTE_CONSTANTS = {
  EMBED_COLOR_SPINNING: 0xf39c12,
  EMBED_COLOR_WINNER:   0x57f287,
  SPIN_DURATION_MS:     2500,
  MAX_PARTICIPANTS:     10,
  MIN_PARTICIPANTS:     2,
  SPIN_VISIBLE_ROWS:    7,
  SESSION_TTL_MS:       15 * 60 * 1000, // 15 min avant expiration de la session
} as const;

export const ROULETTE_SELECT_ID  = "roulette:select";
export const ROULETTE_LAUNCH_PREFIX = "roulette:launch:";
