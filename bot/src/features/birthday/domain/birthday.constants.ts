export const BIRTHDAY_CONSTANTS = {
  COMMAND_NAME: "birthday",
  DEFAULT_EMBED_COLOR: 0xffc857,
  DAILY_CHECK_HOUR: 9,
  MONTH_NAMES: [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ],
} as const;

// Menus déroulants — sélection guidée de la date (mois puis jour)
export const BIRTHDAY_MONTH_SELECT_ID = "birthday:select:month";
export const BIRTHDAY_DAY_SELECT_PREFIX = "birthday:select:day:";

// Boutons — confirmation de suppression
export const BIRTHDAY_CONFIRM_DELETE_ID = "birthday:btn:confirm-delete";
export const BIRTHDAY_CANCEL_DELETE_ID = "birthday:btn:cancel-delete";
