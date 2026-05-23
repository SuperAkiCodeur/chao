import type { ButtonInteraction, GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import { logger } from "../../../core/app/logger.js";

export const SELFROLE_BUTTON_PREFIX = "selfrole:";

export function isSelfRoleButton(customId: string): boolean {
  return customId.startsWith(SELFROLE_BUTTON_PREFIX);
}

export async function handleSelfRoleButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const roleId = interaction.customId.slice(SELFROLE_BUTTON_PREFIX.length);
  const member = interaction.member as GuildMember;
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    await interaction.reply({
      content: "❌ Ce rôle n'existe plus. Contacte un administrateur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const hasRole = member.roles.cache.has(roleId);

    if (hasRole) {
      await member.roles.remove(role);
      await interaction.reply({
        content: `✅ Rôle **${role.name}** retiré.`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await member.roles.add(role);
      await interaction.reply({
        content: `✅ Rôle **${role.name}** obtenu !`,
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (error) {
    logger.error("Failed to toggle self-role", {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      roleId,
      error,
    });

    await interaction.reply({
      content: "❌ Impossible de modifier ton rôle. Vérifie que le bot a bien la permission de gérer ce rôle.",
      flags: MessageFlags.Ephemeral,
    }).catch(() => null);
  }
}
