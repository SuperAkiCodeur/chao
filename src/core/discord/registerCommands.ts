import { REST, Routes } from "discord.js";
import { logger } from "../app/logger.js";
import { commandRegistry } from "./commandRegistry.js";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

export async function registerCommands(): Promise<void> {
  const token = getRequiredEnv("DISCORD_TOKEN");
  const applicationId = getRequiredEnv("CLIENT_ID");
  const guildId = process.env.GUILD_ID;

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