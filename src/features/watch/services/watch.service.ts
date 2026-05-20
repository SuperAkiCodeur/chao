import type {
  ChatInputCommandInteraction,
  Client,
  Guild,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import {
  addSpectatorRoleByUserId,
  removeSpectatorRoleByUserId,
} from "../../../shared/services/spectatorRole.service.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import {
  parseWatchViewingDate,
  validateWatchScheduleInput,
  validateWatchTitleInput,
} from "../domain/watch.validators.js";
import type {
  EndWatchPartyParams,
  StartWatchPartyParams,
  WatchCommandResult,
  WatchParty,
} from "../domain/watch.types.js";
import {
  addUserToWatchParty,
  clearWatchStartAnnouncementMessageId,
  deleteWatchParty,
  findActiveWatchPartyByMedia,
  findWatchPartyByMessageId,
  findWatchPartyByStartAnnouncementMessageId,
  removeUserFromWatchParty,
  saveWatchParty,
  userHasAnotherActiveWatchParty,
} from "../repositories/watch.repository.js";
import { fetchTmdbMedia } from "./tmdb.service.js";
import { buildWatchAnnouncement } from "./watchAnnouncement.service.js";
import {
  cancelWatchStartAnnouncement,
  scheduleWatchStartAnnouncement,
} from "./watchScheduler.service.js";

type WritableInteractionChannel = NonNullable<ChatInputCommandInteraction["channel"]> & {
  send: (...args: any[]) => Promise<any>;
};

type FetchableMessageChannel = {
  messages: {
    fetch: (messageId: string) => Promise<any>;
  };
};

function ensureGuildInteraction(
  interaction: ChatInputCommandInteraction,
): asserts interaction is ChatInputCommandInteraction<"cached"> {
  if (!interaction.inCachedGuild()) {
    throw new Error("This command must be used in a guild");
  }
}

function ensureWritableTextChannel(
  channel: ChatInputCommandInteraction["channel"],
): asserts channel is WritableInteractionChannel {
  if (
    !channel ||
    !channel.isTextBased() ||
    !("send" in channel) ||
    typeof channel.send !== "function"
  ) {
    throw new Error("Channel is not writable text-based");
  }
}

function hasFetchableMessages(channel: unknown): channel is FetchableMessageChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  if (!("messages" in channel)) {
    return false;
  }

  const candidate = channel as { messages?: { fetch?: unknown } };

  return typeof candidate.messages?.fetch === "function";
}

function getSpectatorRoleId(): string {
  const spectatorRoleId = process.env.SPECTATOR_ROLE_ID;

  if (!spectatorRoleId) {
    throw new Error("SPECTATOR_ROLE_ID is missing");
  }

  return spectatorRoleId;
}

function getTicketChannelId(): string {
  const ticketChannelId = process.env.TICKET_CHANNEL_ID;

  if (!ticketChannelId) {
    throw new Error("TICKET_CHANNEL_ID is missing");
  }

  return ticketChannelId;
}

function getCinemaCategoryId(): string {
  const cinemaCategoryId = process.env.CINEMA_CATEGORY_ID;

  if (!cinemaCategoryId) {
    throw new Error("CINEMA_CATEGORY_ID is missing");
  }

  return cinemaCategoryId;
}

function isWatchStartChannelAllowed(channelId: string): boolean {
  return channelId === getTicketChannelId();
}

function isWatchEndChannelAllowed(
  channel: ChatInputCommandInteraction["channel"],
): boolean {
  if (!channel || !("parentId" in channel)) {
    return false;
  }

  return channel.parentId === getCinemaCategoryId();
}

async function deleteWatchMessageById(
  client: Client,
  channelId: string,
  messageId?: string,
): Promise<void> {
  if (!messageId) {
    return;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased() || !hasFetchableMessages(channel)) {
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);

  if (!message) {
    return;
  }

  await message.delete().catch((error: unknown) => {
    logger.error("Failed to delete watch message", {
      channelId,
      messageId,
      error,
    });
  });
}

async function deleteWatchAnnouncementMessages(
  client: Client,
  watchParty: WatchParty,
): Promise<void> {
  await deleteWatchMessageById(
    client,
    watchParty.channelId,
    watchParty.startAnnouncementMessageId,
  );

  await deleteWatchMessageById(
    client,
    watchParty.channelId,
    watchParty.messageId,
  );
}

async function cleanupSpectatorRolesForWatchParty(
  guild: Guild,
  watchParty: WatchParty,
): Promise<void> {
  if (!watchParty.roleId) {
    return;
  }

  for (const userId of watchParty.users) {
    const hasAnotherWatchParty = userHasAnotherActiveWatchParty(
      watchParty.guildId,
      userId,
      watchParty.messageId,
    );

    if (!hasAnotherWatchParty) {
      await removeSpectatorRoleByUserId(
        guild,
        userId,
        watchParty.roleId,
        "Watch party ended",
      );
    }
  }
}

async function cleanupWatchParty(
  client: Client,
  guild: Guild,
  watchParty: WatchParty,
): Promise<void> {
  cancelWatchStartAnnouncement(watchParty.messageId);
  await deleteWatchAnnouncementMessages(client, watchParty);
  await cleanupSpectatorRolesForWatchParty(guild, watchParty);
  deleteWatchParty(watchParty.messageId);
}

export async function startWatchParty(
  params: StartWatchPartyParams,
): Promise<WatchCommandResult> {
  const { interaction, type, title, date, time } = params;

  ensureGuildInteraction(interaction);
  ensureWritableTextChannel(interaction.channel);

  if (!isWatchStartChannelAllowed(interaction.channelId)) {
    return {
      message: "❌ /watch start est utilisable uniquement dans le salon billetterie.",
    };
  }

  const titleValidation = validateWatchTitleInput(title);

  if (!titleValidation.success) {
    return {
      message: titleValidation.message,
    };
  }

  const scheduleValidation = validateWatchScheduleInput(date, time);

  if (!scheduleValidation.success) {
    return {
      message: scheduleValidation.message,
    };
  }

  const viewingDate = parseWatchViewingDate(date, time);

  if (!viewingDate) {
    return {
      message: "❌ Date ou heure invalide.",
    };
  }

  const media = await fetchTmdbMedia(type, title);

  if (!media) {
    return {
      message: `❌ Aucun résultat trouvé pour "${title}".`,
    };
  }

  const activeWatchParty = findActiveWatchPartyByMedia(type, media.mediaId);

  if (activeWatchParty) {
    return {
      message: `❌ Une diffusion est déjà prévue pour "${activeWatchParty.title}".`,
    };
  }

  const { embed, resolvedTitle } = buildWatchAnnouncement({
    type,
    title,
    date,
    time,
    bestMatch: media.bestMatch,
    details: media.details,
    credits: media.credits,
  });

  const message = await interaction.channel.send({
    embeds: [embed],
  });

  await message.react(WATCH_CONSTANTS.TICKET_EMOJI);

  const watchParty: WatchParty = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: message.id,
    roleId: getSpectatorRoleId(),
    title: resolvedTitle,
    mediaType: type,
    mediaId: media.mediaId,
    viewingAt: viewingDate.toISOString(),
    status: WATCH_CONSTANTS.ACTIVE_STATUS,
    users: [],
  };

  saveWatchParty(watchParty);
  scheduleWatchStartAnnouncement(interaction.client, watchParty);

  logger.info("Watch party started", {
    guildId: watchParty.guildId,
    channelId: watchParty.channelId,
    messageId: watchParty.messageId,
    mediaType: watchParty.mediaType,
    mediaId: watchParty.mediaId,
    title: watchParty.title,
    viewingAt: watchParty.viewingAt,
  });

  return {
    message: "✅ Annonce publiée !",
  };
}

export async function endWatchParty(
  params: EndWatchPartyParams,
): Promise<WatchCommandResult> {
  const { interaction, type, title } = params;

  ensureGuildInteraction(interaction);

  if (!isWatchEndChannelAllowed(interaction.channel)) {
    return {
      message: "❌ /watch end est utilisable uniquement dans la catégorie Cinéma.",
    };
  }

  const titleValidation = validateWatchTitleInput(title);

  if (!titleValidation.success) {
    return {
      message: titleValidation.message,
    };
  }

  const media = await fetchTmdbMedia(type, title);

  if (!media) {
    return {
      message: `❌ Aucun résultat trouvé pour "${title}".`,
    };
  }

  const activeWatchParty = findActiveWatchPartyByMedia(type, media.mediaId);

  if (!activeWatchParty) {
    return {
      message: `❌ Aucune diffusion active trouvée pour "${title}".`,
    };
  }

  await cleanupWatchParty(interaction.client, interaction.guild, activeWatchParty);

  logger.info("Watch party ended", {
    guildId: activeWatchParty.guildId,
    channelId: activeWatchParty.channelId,
    messageId: activeWatchParty.messageId,
    mediaType: activeWatchParty.mediaType,
    mediaId: activeWatchParty.mediaId,
    title: activeWatchParty.title,
  });

  return {
    message: `✅ Diffusion terminée pour "${activeWatchParty.title}".`,
  };
}

export async function handleDeletedWatchMessage(params: {
  messageId: string;
  guildId: string | null;
  guild?: Guild;
}): Promise<void> {
  const watchParty = findWatchPartyByMessageId(params.messageId);

  if (watchParty) {
    cancelWatchStartAnnouncement(params.messageId);

    if (params.guild) {
      await cleanupSpectatorRolesForWatchParty(params.guild, watchParty);
    }

    deleteWatchParty(params.messageId);

    logger.info("Watch party deleted after main message deletion", {
      messageId: params.messageId,
      guildId: params.guildId,
      title: watchParty.title,
    });

    return;
  }

  const watchPartyByStartAnnouncement = findWatchPartyByStartAnnouncementMessageId(
    params.messageId,
  );

  if (!watchPartyByStartAnnouncement) {
    return;
  }

  clearWatchStartAnnouncementMessageId(params.messageId);

  logger.info("Watch start announcement reference cleared after message deletion", {
    messageId: params.messageId,
    guildId: params.guildId,
    title: watchPartyByStartAnnouncement.title,
  });
}

export async function handleWatchReactionAdd(params: {
  guild: Guild;
  messageId: string;
  userId: string;
}): Promise<void> {
  const watchParty = addUserToWatchParty(params.messageId, params.userId);

  if (!watchParty) {
    return;
  }

  if (!watchParty.roleId) {
    return;
  }

  await addSpectatorRoleByUserId(
    params.guild,
    params.userId,
    watchParty.roleId,
    "User joined a watch party",
  );

  logger.info("Watch party reaction added", {
    guildId: params.guild.id,
    messageId: params.messageId,
    userId: params.userId,
    title: watchParty.title,
  });
}

export async function handleWatchReactionRemove(params: {
  guild: Guild;
  messageId: string;
  userId: string;
}): Promise<void> {
  const watchParty = removeUserFromWatchParty(params.messageId, params.userId);

  if (!watchParty) {
    return;
  }

  if (!watchParty.roleId) {
    return;
  }

  const hasAnotherWatchParty = userHasAnotherActiveWatchParty(
    params.guild.id,
    params.userId,
    params.messageId,
  );

  if (!hasAnotherWatchParty) {
    await removeSpectatorRoleByUserId(
      params.guild,
      params.userId,
      watchParty.roleId,
      "User left all watch parties",
    );
  }

  logger.info("Watch party reaction removed", {
    guildId: params.guild.id,
    messageId: params.messageId,
    userId: params.userId,
    title: watchParty.title,
  });
}