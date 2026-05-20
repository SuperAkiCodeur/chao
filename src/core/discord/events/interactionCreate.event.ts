import { Events, type Interaction } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { getCommand } from "../commandRegistry.js";

export const interactionCreateEvent: AppEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = getCommand(interaction.commandName);

    if (!command) {
      logger.warn("Command not found", {
        commandName: interaction.commandName,
      });

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Commande inconnue.",
          ephemeral: true,
        });
      }

      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error("Command execution failed", {
        commandName: interaction.commandName,
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        error,
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ Une erreur est survenue pendant l’exécution de la commande.",
          ephemeral: true,
        }).catch(() => null);
        return;
      }

      await interaction.reply({
        content: "❌ Une erreur est survenue pendant l’exécution de la commande.",
        ephemeral: true,
      }).catch(() => null);
    }
  },
};