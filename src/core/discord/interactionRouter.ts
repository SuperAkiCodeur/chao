import type { ChatInputCommandInteraction } from "discord.js";
import { logger } from "../app/logger.js";
import { getCommand } from "./commandRegistry.js";

export async function routeChatInputCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const command = getCommand(interaction.commandName);

  if (!command) {
    logger.warn("Command not found", {
      commandName: interaction.commandName,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error("Command execution failed", {
      commandName: interaction.commandName,
      error,
    });

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "Une erreur est survenue pendant l’exécution de la commande.",
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: "Une erreur est survenue pendant l’exécution de la commande.",
      ephemeral: true,
    });
  }
}