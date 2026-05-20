import {
  Client,
  GatewayIntentBits,
  Partials,
} from "discord.js";
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

  loadEvents(client);

  return {
    client,
    async start() {
      const token = process.env.DISCORD_TOKEN;

      if (!token) {
        throw new Error("DISCORD_TOKEN is missing in environment variables.");
      }

      await client.login(token);
    },
  };
}