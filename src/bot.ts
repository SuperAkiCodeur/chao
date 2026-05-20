import { Client, GatewayIntentBits } from "discord.js";
import { loadEvents } from "./core/discord/eventLoader.js";

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
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