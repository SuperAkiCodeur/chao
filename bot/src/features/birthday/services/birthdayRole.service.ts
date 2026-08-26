import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../../core/app/logger.js";

async function getGuildMember(guild: Guild, userId: string): Promise<GuildMember | null> {
  return guild.members.fetch(userId).catch(() => null);
}

export async function addBirthdayRoleByUserId(
  guild: Guild,
  userId: string,
  roleId: string,
): Promise<void> {
  const member = await getGuildMember(guild, userId);

  if (!member || member.roles.cache.has(roleId)) {
    return;
  }

  await member.roles.add(roleId, "Anniversaire du jour");

  logger.info("[birthday] Role added", {
    guildId: guild.id,
    userId,
    roleId,
  });
}

export async function removeBirthdayRole(member: GuildMember, roleId: string): Promise<void> {
  if (!member.roles.cache.has(roleId)) {
    return;
  }

  await member.roles.remove(roleId, "Fin de la journée d'anniversaire");

  logger.info("[birthday] Role removed", {
    guildId: member.guild.id,
    userId: member.id,
    roleId,
  });
}
