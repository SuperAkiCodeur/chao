export const DEALS_CONSTANTS = {
  EMBED_COLOR:        0x1b2838, // Steam dark
  EMBED_COLOR_SALE:   0x4c6b22, // Steam vert promo
  EMBED_COLOR_PRICES: 0x1a9fff, // Steam bleu
  MAX_SEARCH_RESULTS: 10,
  TRACKER_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6h
} as const;

// Custom IDs
export const DEALS_MENU_ID           = "deals:menu";
export const DEALS_ADD_SELECT_ID     = "deals:add:select";
export const DEALS_PRICE_SELECT_ID   = "deals:price:select";
export const DEALS_REMOVE_SELECT_ID  = "deals:remove:select";
export const DEALS_MODAL_ADD_ID      = "deals:modal:add";
export const DEALS_INPUT_NAME_ID     = "deals:input:name";
export const DEALS_BACK_BTN_ID       = "deals:btn:back";
