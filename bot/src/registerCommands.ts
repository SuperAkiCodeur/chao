import { REST, Routes } from "discord.js";
import { env } from "./core/config/env.js";
import { registerCommands } from "./core/discord/registerCommands.js";

async function main(): Promise<void> {
  const arg = process.argv[2];

  // --clear-global : supprime toutes les commandes globales
  if (arg === "--clear-global") {
    const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: [] });
    console.log("[registerCommands] Global commands cleared");
    return;
  }

  // Sinon : enregistre les commandes (guild si GUILD_ID fourni, global sinon)
  await registerCommands(arg);
  console.log("[registerCommands] done");
}

main().catch((error) => {
  console.error("[registerCommands] failed", error);
});