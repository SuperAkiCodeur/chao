function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

export const env = {
  DISCORD_TOKEN: getRequiredEnv("DISCORD_TOKEN"),
  CLIENT_ID: getRequiredEnv("CLIENT_ID"),
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  TMDB_API_KEY: getRequiredEnv("TMDB_API_KEY"),
  SPECTATOR_ROLE_ID: getRequiredEnv("SPECTATOR_ROLE_ID"),
  VOICE_TRIGGER_CHANNEL_ID: getRequiredEnv("VOICE_TRIGGER_CHANNEL_ID"),
  VOICE_CHATTING_ROLE_ID: getRequiredEnv("VOICE_CHATTING_ROLE_ID"),
  TICKET_CHANNEL_ID: getRequiredEnv("TICKET_CHANNEL_ID"),
  CINEMA_CATEGORY_ID: getRequiredEnv("CINEMA_CATEGORY_ID"),
  LETTERBOXD_CHANNEL_ID: getRequiredEnv("LETTERBOXD_CHANNEL_ID"),
  DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
  HENRIKDEV_API_KEY: process.env.HENRIKDEV_API_KEY,
  VALORANT_CHANNEL_ID: process.env.VALORANT_CHANNEL_ID,
} as const;
