import { Events, MessageFlags, type ButtonInteraction, type Interaction } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { env } from "../../config/env.js";
import { logger } from "../../app/logger.js";
import { getCommand } from "../commandRegistry.js";
import { VALORANT_ROLE_BUTTON_ID } from "../../../features/valorant/services/valorant.service.js";
import { handleSelfRoleButton, isSelfRoleButton } from "../../../features/selfrole/services/selfrole.service.js";

async function handleValorantRoleButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const roleId = env.VALORANT_ROLE_ID;

  if (!roleId) {
    await interaction.reply({
      content: "❌ Le rôle Valorant n'est pas configuré.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
      await member.roles.remove(roleId);
      await interaction.reply({
        content: "✅ Rôle Valorant retiré.",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await member.roles.add(roleId);
      await interaction.reply({
        content: "✅ Rôle Valorant obtenu ! Tu peux maintenant utiliser les commandes Valorant.",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error("Failed to toggle Valorant role", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      roleId,
      error,
    });

    await interaction.reply({
      content: "❌ Impossible de modifier ton rôle. Réessaie plus tard.",
      flags: MessageFlags.Ephemeral,
    }).catch(() => null);
  }
}

export const interactionCreateEvent: AppEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isButton()) {
      if (interaction.customId === VALORANT_ROLE_BUTTON_ID) {
        await handleValorantRoleButton(interaction);
      } else if (isSelfRoleButton(interaction.customId)) {
        await handleSelfRoleButton(interaction);
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