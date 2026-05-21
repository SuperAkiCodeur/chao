import { Client, GatewayIntentBits, Partials } from "discord.js";
import { env } from "./core/config/env.js";
import { logger } from "./core/app/logger.js";
import { loadEvents } from "./core/discord/eventLoader.js";

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
    ],
  });

  client.on("debug", (message) => {
    logger.info("[discord debug]", message);
  });

  client.on("warn", (message) => {
    logger.warn("[discord warn]", message);
  });

  client.on("error", (error) => {
    logger.error("[discord error]", { error });
  });

  loadEvents(client);

  return {
    client,
    async start() {
      logger.info("[bot] logging in");
      await client.login(env.DISCORD_TOKEN);
      logger.info("[bot] login promise resolved");
    },
  };
}