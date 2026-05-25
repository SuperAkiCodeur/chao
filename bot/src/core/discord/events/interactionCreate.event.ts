import { Events, MessageFlags, type Interaction } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { getCommand } from "../commandRegistry.js";
import { handleSelfRoleButton, isSelfRoleButton } from "../../../features/selfrole/services/selfrole.service.js";
import { handleWatchRatingButton, handleWatchTicketButton } from "../../../features/watch/services/watch.service.js";
import { WATCH_CONSTANTS } from "../../../features/watch/domain/watch.constants.js";
import {
  handleRouletteSelect,
  handleRouletteLaunch,
  handleRouletteRetry,
  handleRouletteCancel,
} from "../../../features/roulette/services/roulette.service.js";
import {
  ROULETTE_SELECT_ID,
  ROULETTE_LAUNCH_PREFIX,
  ROULETTE_RETRY_ID,
} from "../../../features/roulette/commands/roulette.command.js";

export const interactionCreateEvent: AppEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    // ── User select menus ──────────────────────────────────────────────────
    if (interaction.isUserSelectMenu()) {
      if (interaction.customId === ROULETTE_SELECT_ID) {
        await handleRouletteSelect(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === WATCH_CONSTANTS.TICKET_BUTTON_ID) {
        await handleWatchTicketButton(interaction);
      } else if (interaction.customId.startsWith(WATCH_CONSTANTS.RATING_BUTTON_PREFIX)) {
        await handleWatchRatingButton(interaction);
      } else if (isSelfRoleButton(interaction.customId)) {
        await handleSelfRoleButton(interaction);
      } else if (interaction.customId.startsWith(ROULETTE_LAUNCH_PREFIX)) {
        await handleRouletteLaunch(interaction);
      } else if (interaction.customId === ROULETTE_RETRY_ID) {
        await handleRouletteRetry(interaction);
      } else if (interaction.customId === "roulette:cancel") {
        await handleRouletteCancel(interaction);
      }
      return;
    }

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
          flags: MessageFlags.Ephemeral,
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
          flags: MessageFlags.Ephemeral,
        }).catch(() => null);
        return;
      }

      await interaction.reply({
        content: "❌ Une erreur est survenue pendant l’exécution de la commande.",
        flags: MessageFlags.Ephemeral,
      }).catch(() => null);
    }
  },
};