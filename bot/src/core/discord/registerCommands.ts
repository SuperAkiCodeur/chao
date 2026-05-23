import { REST, Routes } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../app/logger.js";
import { commandRegistry } from "./commandRegistry.js";

export async function registerCommands(): Promise<void> {
  const { DISCORD_TOKEN: token, CLIENT_ID: applicationId, DISCORD_GUILD_ID: guildId } = env;

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
