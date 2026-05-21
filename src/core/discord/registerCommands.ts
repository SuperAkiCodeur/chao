import { REST, Routes } from "discord.js";
import { logger } from "../app/logger.js";
import { commandRegistry } from "./commandRegistry.js";

export async function registerCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const applicationId = process.env.CLIENT_ID;

  if (!token) throw new Error("DISCORD_TOKEN is missing");
  if (!applicationId) throw new Error("CLIENT_ID is missing");

  const guildId = process.env.DISCORD_GUILD_ID;

  const commands = Array.from(commandRegistry.values()).map((command) =>
    command.data.toJSON(),
  );

  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    await rest.put(
      Routes.applicationGuildCommands(applicationId, guildId),
      { body: commands },
    );

    logger.info("Guild commands registered", {
      applicationId,
      guildId,
      commandCount: commands.length,
    });

    return;
  }

  await rest.put(
    Routes.applicationCommands(applicationId),
    { body: commands },
  );

  logger.info("Global commands registered", {
    applicationId,
    commandCount: commands.length,
  });
}
