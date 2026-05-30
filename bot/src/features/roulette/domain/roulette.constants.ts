export const ROULETTE_CONSTANTS = {
  EMBED_COLOR_WINNER: 0xffffff,
  MAX_PARTICIPANTS:   10,
  MIN_PARTICIPANTS:   2,
  SESSION_TTL_MS:     15 * 60 * 1000, // 15 min avant expiration de la session
} as const;

export const ROULETTE_SELECT_ID     = "roulette:select";
export const ROULETTE_LAUNCH_PREFIX = "roulette:launch:";
export const ROULETTE_RETRY_ID      = "roulette:retry";
export const ROULETTE_MENU_ID       = "roulette:menu";
export const ROULETTE_BACK_BTN_ID   = "roulette:btn:back";
