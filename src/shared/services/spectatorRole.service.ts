import type { Guild, GuildMember } from "discord.js";
import { logger } from "../../core/app/logger.js";

type SpectatorParticipationChecker = (params: {
  guildId: string;
  userId: string;
}) => Promise<boolean>;

export async function getGuildMember(
  guild: Guild,
  userId: string,
): Promise<GuildMember | null> {
  return guild.members.fetch(userId).catch(() => null);
}

export async function addSpectatorRole(
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

export async function removeSpectatorRole(
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

export async function memberHasSpectatorRole(
  guild: Guild,
  userId: string,
  spectatorRoleId: string,
): Promise<boolean> {
  const member = await getGuildMember(guild, userId);

  if (!member) {
    return false;
  }

  return member.roles.cache.has(spectatorRoleId);
}

export async function syncSpectatorRole(
  guild: Guild,
  userId: string,
  spectatorRoleId: string,
  hasActiveParticipation: SpectatorParticipationChecker,
): Promise<void> {
  const member = await getGuildMember(guild, userId);

  if (!member || member.user.bot) {
    return;
  }

  const shouldKeepRole = await hasActiveParticipation({
    guildId: guild.id,
    userId,
  });

  if (shouldKeepRole) {
    if (!member.roles.cache.has(spectatorRoleId)) {
      await addSpectatorRole(member, spectatorRoleId);
    }

    return;
  }

  if (member.roles.cache.has(spectatorRoleId)) {
    await removeSpectatorRole(member, spectatorRoleId);
  }
}