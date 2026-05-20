import { Client, GatewayIntentBits, Partials } from "discord.js";
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
    console.log("[discord debug]", message);
  });

  client.on("warn", (message) => {
    console.warn("[discord warn]", message);
  });

  client.on("error", (error) => {
    console.error("[discord error]", error);
  });

  loadEvents(client);

  return {
    client,
    async start() {
      const token = process.env.DISCORD_TOKEN;

      if (!token) {
        throw new Error("DISCORD_TOKEN is missing in environment variables.");
      }

      console.log("[bot] logging in");
      await client.login(token);
      console.log("[bot] login promise resolved");
    },
  };
}