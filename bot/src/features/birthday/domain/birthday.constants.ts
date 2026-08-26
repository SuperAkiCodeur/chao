export const BIRTHDAY_CONSTANTS = {
  COMMAND_NAME: "birthday",
  DEFAULT_EMBED_COLOR: 0xffc857,
  DAILY_CHECK_HOUR: 9,
  MONTH_NAMES: [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ],
} as const;

// Modal — saisie de la date d'anniversaire
export const BIRTHDAY_MODAL_SET_ID = "birthday:modal:set";
export const BIRTHDAY_INPUT_DATE_ID = "birthday:input:date";
