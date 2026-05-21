import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../../core/app/logger.js";

async function getGuildMember(
  guild: Guild,
  userId: string,
): Promise<GuildMember | null> {
  return guild.members.fetch(userId).catch(() => null);
}

async function addSpectatorRole(
  member: GuildMember,
  spectatorRoleId: string,
  reason = "Spectator participation detected",
): Promise<void> {
  if (member.user.bot) {
    return;
  }

  if (member.roles.cache.has(spectatorRoleId)) {
    return;
  }

  await member.roles.add(spectatorRoleId, reason);

  logger.info("Spectator role added", {
    guildId: member.guild.id,
    userId: member.id,
    roleId: spectatorRoleId,
  });
}

async function removeSpectatorRole(
  member: GuildMember,
  spectatorRoleId: string,
  reason = "No spectator participation remaining",
): Promise<void> {
  if (member.user.bot) {
    return;
  }

  if (!member.roles.cache.has(spectatorRoleId)) {
    return;
  }

  await member.roles.remove(spectatorRoleId, reason);

  logger.info("Spectator role removed", {
    guildId: member.guild.id,
    userId: member.id,
    roleId: spectatorRoleId,
  });
}

export async function addSpectatorRoleByUserId(
  guild: Guild,
  userId: string,
  spectatorRoleId: string,
  reason = "Spectator participation detected",
): Promise<void> {
  const member = await getGuildMember(guild, userId);

  if (!member) {
    return;
  }

  await addSpectatorRole(member, spectatorRoleId, reason);
}

export async function removeSpectatorRoleByUserId(
  guild: Guild,
  userId: string,
  spectatorRoleId: string,
  reason = "No spectator participation remaining",
): Promise<void> {
  const member = await getGuildMember(guild, userId);

  if (!member) {
    return;
  }

  await removeSpectatorRole(member, spectatorRoleId, reason);
}
