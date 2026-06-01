import { Client, GatewayIntentBits } from "discord.js";
import { env } from "./core/config/env.js";
import { logger } from "./core/app/logger.js";
import { loadEvents } from "./core/discord/eventLoader.js";
import { startDealsTracker } from "./features/deals/services/deals.tracker.js";
import { startNewsTracker } from "./features/news/services/news.tracker.js";

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent, // privileged — must be enabled in Discord Dev Portal
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
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
      await client.login(env.DISCORD_TOKEN);
      startDealsTracker(client);
      startNewsTracker(client);
    },
  };
}