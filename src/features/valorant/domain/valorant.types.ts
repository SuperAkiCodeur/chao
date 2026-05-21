export type ValorantRegion = "eu" | "na" | "ap" | "kr" | "latam" | "br";

export type ValorantStatsType = "global" | "agent" | "map" | "weapon" | "playtime";

// ---------------------------------------------------------------------------
// Henrik Dev API shapes
// ---------------------------------------------------------------------------

export type HenrikAccount = {
  puuid: string;
  name: string;
  tag: string;
  region: string;
  account_level: number;
};

export type HenrikMmrData = {
  name: string;
  tag: string;
  current_data: {
    currenttier: number;
    currenttierpatched: string;
    ranking_in_tier: number;
    mmr_change_to_last_game: number;
    elo: number;
  } | null;
};

export type HenrikMatchPlayer = {
  puuid: string;
  name: string;
  tag: string;
  team: "Red" | "Blue";
  character: string;
  stats: {
    score: number;
    kills: number;
    deaths: number;
    assists: number;
  };
  currenttier_patched: string;
};

export type HenrikMatch = {
  metadata: {
    matchid: string;
    map: string;
    mode: string;
    game_start: number;
    game_length: number;
  };
  players: {
    all_players: HenrikMatchPlayer[];
  };
  teams: {
    red: { has_won: boolean; rounds_won: number; rounds_lost: number };
    blue: { has_won: boolean; rounds_won: number; rounds_lost: number };
  };
};

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export type ValorantLinkedAccount = {
  discordUserId: string;
  guildId: string;
  riotId: string;
  puuid: string | null;
  region: string | null;
  linkedAt: string;
};
