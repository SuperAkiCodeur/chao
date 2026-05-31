export const DEALS_CONSTANTS = {
  EMBED_COLOR:        0x1b2838,
  EMBED_COLOR_SALE:   0x22c55e,
  EMBED_COLOR_PRICES: 0x3b82f6,
  TRACKER_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6h
} as const;

// ── Custom IDs fixes ───────────────────────────────────────────────────────────
export const DEALS_MAIN_MENU_ID      = "deals:main";
export const DEALS_LISTS_SELECT_ID   = "deals:lists";
export const DEALS_CREATE_MODAL_ID   = "deals:modal:create";
export const DEALS_CREATE_NAME_INPUT = "deals:input:name";
export const DEALS_SEARCH_NAME_INPUT = "deals:input:search";
export const DEALS_BACK_MAIN_BTN_ID  = "deals:back";

// ── Préfixes (suffixe = listId) ────────────────────────────────────────────────
export const DEALS_ACTION_PREFIX      = "deals:act:";
export const DEALS_SEARCH_MODAL_PFX   = "deals:modal:s:";
export const DEALS_ADD_RESULT_PFX     = "deals:add:";
export const DEALS_REMOVE_PFX         = "deals:rm:";
export const DEALS_PRICE_PFX          = "deals:px:";
export const DEALS_SHARE_PFX          = "deals:share:";
export const DEALS_BACK_LIST_PFX      = "deals:bk:";
export const DEALS_DELETE_PFX         = "deals:del:";
