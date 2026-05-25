export const STEAM_CONSTANTS = {
  EMBED_COLOR:        0x1b2838, // Steam dark
  EMBED_COLOR_SALE:   0x4c6b22, // Steam vert promo
  EMBED_COLOR_PRICES: 0x1a9fff, // Steam bleu
  MAX_SEARCH_RESULTS: 10,
  TRACKER_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6h
} as const;

// Custom IDs
export const STEAM_MENU_ID           = "steam:menu";
export const STEAM_ADD_SELECT_ID     = "steam:add:select";
export const STEAM_PRICE_SELECT_ID   = "steam:price:select";
export const STEAM_REMOVE_SELECT_ID  = "steam:remove:select";
export const STEAM_MODAL_ADD_ID      = "steam:modal:add";
export const STEAM_INPUT_NAME_ID     = "steam:input:name";
export const STEAM_BACK_BTN_ID       = "steam:btn:back";
