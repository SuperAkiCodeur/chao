export const CINEMA_CONSTANTS = {
  COMMAND_NAME: "cinema",
  TICKET_BUTTON_ID: "cinema:ticket",
  LAUNCH_BUTTON_ID: "cinema:btn:launch",
  END_BUTTON_ID: "cinema:btn:end:party",
  RATING_BUTTON_PREFIX: "cinema:rating:",
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

// Menu custom IDs
export const CINEMA_MENU_ID                = "cinema:menu";
export const CINEMA_TYPE_SELECT_START_ID   = "cinema:select:type:start";
export const CINEMA_END_SELECT_ID          = "cinema:select:end:party";
export const CINEMA_BACK_BTN_ID            = "cinema:btn:back";

// Modals — le type (movie|tv) est encodé en suffixe du customId
// ex: "cinema:modal:start:movie" ou "cinema:modal:start:tv"
export const CINEMA_MODAL_START_PREFIX     = "cinema:modal:start:";

// Modal input field IDs
export const CINEMA_INPUT_TITLE_ID         = "cinema:input:title";
export const CINEMA_INPUT_DATE_ID          = "cinema:input:date";
export const CINEMA_INPUT_TIME_ID          = "cinema:input:time";

// Panel button IDs (persistent embed in the text channel)
export const CINEMA_PANEL_START_BTN_ID     = "cinema:panel:start";
export const CINEMA_PANEL_END_BTN_ID       = "cinema:panel:end";
export const CINEMA_PANEL_HELP_BTN_ID      = "cinema:panel:help";