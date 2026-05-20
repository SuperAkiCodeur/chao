import type {
  ChatInputCommandInteraction,
  Client,
  Guild,
  MessageReaction,
} from "discord.js";
import { EmbedBuilder } from "discord.js";
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
  WatchRatingValue,
} from "../domain/watch.types.js";
import {
  addUserToWatchParty,
  clearWatchStartAnnouncementMessageId,
  closeWatchRatingSession,
  deleteWatchParty,
  findActiveWatchPartyByMedia,
  findWatchPartyByMessageId,
  findWatchPartyByRatingMessageId,
  findWatchPartyByStartAnnouncementMessageId,
  openWatchRatingSession,
  removeUserFromWatchParty,
  removeWatchPartyUserRating,
  saveWatchParty,
  setWatchPartyUserRating,
  userHasAnotherActiveWatchParty,
} from "../repositories/watch.repository.js";
import { fetchTmdbMedia } from "./tmdb.service.js";
import { buildWatchAnnouncement } from "./watchAnnouncement.service.js";
import {
  cancelWatchStartAnnouncement,
  scheduleWatchRatingClosure,
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

type SendableTextChannel = {
  isTextBased: () => boolean;
  send: (options: {
    embeds?: EmbedBuilder[];
  }) => Promise<{
    id: string;
    react: (emoji: string) => Promise<unknown>;
  }>;
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

function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  if (!("isTextBased" in channel) || !("send" in channel)) {
    return false;
  }

  const candidate = channel as {
    isTextBased?: unknown;
    send?: unknown;
  };

  return (
    typeof candidate.isTextBased === "function" &&
    typeof candidate.send === "function"
  );
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

function getLetterboxdChannelId(): string {
  const letterboxdChannelId = process.env.LETTERBOXD_CHANNEL_ID;

  if (!letterboxdChannelId) {
    throw new Error("LETTERBOXD_CHANNEL_ID is missing");
  }

  return letterboxdChannelId;
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

function buildWatchRatingEmbed(watchParty: WatchParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🎬 Notez ${watchParty.title}`)
    .setDescription(
      [
        "Réagissez avec une note de **1 à 5**.",
        "",
        `${WATCH_CONSTANTS.RATING_EMOJIS[1]} — 1/5`,
        `${WATCH_CONSTANTS.RATING_EMOJIS[2]} — 2/5`,
        `${WATCH_CONSTANTS.RATING_EMOJIS[3]} — 3/5`,
        `${WATCH_CONSTANTS.RATING_EMOJIS[4]} — 4/5`,
        `${WATCH_CONSTANTS.RATING_EMOJIS[5]} — 5/5`,
        "",
        "Le vote se ferme dans 24h.",
      ].join("\n"),
    );
}

function getWatchRatingValueFromEmoji(emoji: string): WatchRatingValue | null {
  const entry = Object.entries(WATCH_CONSTANTS.RATING_EMOJIS).find(([, value]) => {
    return value === emoji;
  });

  if (!entry) {
    return null;
  }

  return Number(entry[0]) as WatchRatingValue;
}

async function removeOtherRatingReactionsForUser(params: {
  reaction: MessageReaction;
  userId: string;
  selectedEmoji: string;
}): Promise<void> {
  const message = params.reaction.message;

  for (const messageReaction of message.reactions.cache.values()) {
    const emojiName = messageReaction.emoji.name;

    if (!emojiName) {
      continue;
    }

    if (!getWatchRatingValueFromEmoji(emojiName)) {
      continue;
    }

    if (emojiName === params.selectedEmoji) {
      continue;
    }

    await messageReaction.users.remove(params.userId).catch(() => null);
  }
}

async function createWatchRatingMessage(
  client: Client,
  watchParty: WatchParty,
): Promise<WatchParty> {
  const letterboxdChannelId = getLetterboxdChannelId();
  const channel = await client.channels.fetch(letterboxdChannelId).catch(() => null);

  if (!channel || !isSendableTextChannel(channel) || !channel.isTextBased()) {
    throw new Error("LETTERBOXD channel not found or not writable");
  }

  const embed = buildWatchRatingEmbed(watchParty);

  const ratingMessage = await channel.send({
    embeds: [embed],
  });

  for (const emoji of Object.values(WATCH_CONSTANTS.RATING_EMOJIS)) {
    await ratingMessage.react(emoji);
  }

  const ratingClosesAt = new Date(
    Date.now() + WATCH_CONSTANTS.RATING_DURATION_MS,
  ).toISOString();

  const updatedWatchParty = openWatchRatingSession({
    messageId: watchParty.messageId,
    ratingChannelId: letterboxdChannelId,
    ratingMessageId: ratingMessage.id,
    ratingClosesAt,
  });

  if (!updatedWatchParty) {
    throw new Error("Failed to open watch rating session");
  }

  scheduleWatchRatingClosure(client, updatedWatchParty);

  logger.info("Watch rating session opened", {
    guildId: updatedWatchParty.guildId,
    channelId: updatedWatchParty.ratingChannelId,
    messageId: updatedWatchParty.messageId,
    ratingMessageId: updatedWatchParty.ratingMessageId,
    title: updatedWatchParty.title,
    ratingClosesAt: updatedWatchParty.ratingClosesAt,
  });

  return updatedWatchParty;
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
  options?: {
    preserveWatchParty?: boolean;
  },
): Promise<void> {
  cancelWatchStartAnnouncement(watchParty.messageId);
  await deleteWatchAnnouncementMessages(client, watchParty);
  await cleanupSpectatorRolesForWatchParty(guild, watchParty);

  if (!options?.preserveWatchParty) {
    deleteWatchParty(watchParty.messageId);
  }
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

  const endedWatchParty: WatchParty = {
    ...activeWatchParty,
    status: WATCH_CONSTANTS.ENDED_STATUS,
  };

  saveWatchParty(endedWatchParty);

  await cleanupWatchParty(
    interaction.client,
    interaction.guild,
    endedWatchParty,
    { preserveWatchParty: true },
  );

  await createWatchRatingMessage(interaction.client, endedWatchParty);

  logger.info("Watch party ended", {
    guildId: endedWatchParty.guildId,
    channelId: endedWatchParty.channelId,
    messageId: endedWatchParty.messageId,
    mediaType: endedWatchParty.mediaType,
    mediaId: endedWatchParty.mediaId,
    title: endedWatchParty.title,
  });

  return {
    message: `✅ Diffusion terminée pour "${endedWatchParty.title}".`,
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

export async function handleWatchRatingReactionAdd(params: {  
  guild: Guild;
  reaction: MessageReaction;
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<void> {
  const watchParty = findWatchPartyByRatingMessageId(params.messageId);

  // à supp
  logger.info("handleWatchRatingReactionAdd called", {
    messageId: params.messageId,
    userId: params.userId,
    emoji: params.emoji,
  });

  if (!watchParty) {
    return;
  }

  const rating = getWatchRatingValueFromEmoji(params.emoji);

  if (!rating) {
    return;
  }

  const updatedWatchParty = setWatchPartyUserRating({
    ratingMessageId: params.messageId,
    userId: params.userId,
    rating,
  });

  if (!updatedWatchParty) {
    return;
  }

  await removeOtherRatingReactionsForUser({
    reaction: params.reaction,
    userId: params.userId,
    selectedEmoji: params.emoji,
  });

  logger.info("Watch rating reaction added", {
    guildId: params.guild.id,
    messageId: params.messageId,
    userId: params.userId,
    title: updatedWatchParty.title,
    rating,
  });
}

export async function handleWatchRatingReactionRemove(params: {
  guild: Guild;
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<void> {
  const watchParty = findWatchPartyByRatingMessageId(params.messageId);

  if (!watchParty) {
    return;
  }

  const rating = getWatchRatingValueFromEmoji(params.emoji);

  if (!rating) {
    return;
  }

  const currentRating = watchParty.ratings?.[params.userId];

  if (!currentRating || currentRating !== rating) {
    return;
  }

  const updatedWatchParty = removeWatchPartyUserRating({
    ratingMessageId: params.messageId,
    userId: params.userId,
  });

  if (!updatedWatchParty) {
    return;
  }

  logger.info("Watch rating reaction removed", {
    guildId: params.guild.id,
    messageId: params.messageId,
    userId: params.userId,
    title: updatedWatchParty.title,
    rating,
  });
}