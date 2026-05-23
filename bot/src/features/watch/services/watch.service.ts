import type {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Guild,
} from "discord.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import {
  addSpectatorRoleByUserId,
  removeSpectatorRoleByUserId,
} from "./spectatorRole.service.js";
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
  closeWatchRatingSession,
  deleteWatchParty,
  findActiveWatchPartyByMedia,
  findWatchPartyByMessageId,
  findWatchPartyByRatingMessageId,
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
    components?: ActionRowBuilder<ButtonBuilder>[];
  }) => Promise<{
    id: string;
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

function isWatchStartChannelAllowed(channelId: string): boolean {
  return channelId === env.TICKET_CHANNEL_ID;
}

function isWatchEndChannelAllowed(
  channel: ChatInputCommandInteraction["channel"],
): boolean {
  if (!channel || !("parentId" in channel)) {
    return false;
  }

  return channel.parentId === env.CINEMA_CATEGORY_ID;
}

function buildWatchRatingEmbed(watchParty: WatchParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🎬 Notez ${watchParty.title}`)
    .setDescription("Clique sur une étoile pour noter. Reclique pour retirer ta note.\n\nLe vote se ferme dans 1h.");
}


async function createWatchRatingMessage(
  client: Client,
  watchParty: WatchParty,
): Promise<WatchParty> {
  const letterboxdChannelId = env.LETTERBOXD_CHANNEL_ID;
  const channel = await client.channels.fetch(letterboxdChannelId).catch(() => null);

  if (!channel || !isSendableTextChannel(channel) || !channel.isTextBased()) {
    throw new Error("LETTERBOXD channel not found or not writable");
  }

  const embed = buildWatchRatingEmbed(watchParty);

  const ratingButtons = ([1, 2, 3, 4, 5] as const).map((value) =>
    new ButtonBuilder()
      .setCustomId(`${WATCH_CONSTANTS.RATING_BUTTON_PREFIX}${value}`)
      .setLabel("⭐".repeat(value))
      .setStyle(ButtonStyle.Secondary),
  );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(...ratingButtons);

  const ratingMessage = await channel.send({
    embeds: [embed],
    components: [row],
  });

  const ratingClosesAt = new Date(
    Date.now() + WATCH_CONSTANTS.RATING_DURATION_MS,
  ).toISOString();

  const updatedWatchParty = await openWatchRatingSession({
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
    const hasAnotherWatchParty = await userHasAnotherActiveWatchParty(
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
      message: `❌ /watch start est utilisable uniquement dans le salon <#${env.TICKET_CHANNEL_ID}>.`,
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

  const activeWatchParty = await findActiveWatchPartyByMedia(type, media.mediaId);

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

  const ticketButton = new ButtonBuilder()
    .setCustomId(WATCH_CONSTANTS.TICKET_BUTTON_ID)
    .setLabel("Prendre un ticket")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎟️");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(ticketButton);

  const message = await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });

  const watchParty: WatchParty = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    messageId: message.id,
    roleId: env.SPECTATOR_ROLE_ID,
    title: resolvedTitle,
    mediaType: type,
    mediaId: media.mediaId,
    viewingAt: viewingDate.toISOString(),
    status: WATCH_CONSTANTS.ACTIVE_STATUS,
    users: [],
  };

  await saveWatchParty(watchParty);
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

  const activeWatchParty = await findActiveWatchPartyByMedia(type, media.mediaId);

  if (!activeWatchParty) {
    return {
      message: `❌ Aucune diffusion active trouvée pour "${title}".`,
    };
  }

  const endedWatchParty: WatchParty = {
    ...activeWatchParty,
    status: WATCH_CONSTANTS.ENDED_STATUS,
  };

  await saveWatchParty(endedWatchParty);

  const viewingTimestamp = new Date(endedWatchParty.viewingAt).getTime();
  const hasViewingStarted =
    !Number.isNaN(viewingTimestamp) && viewingTimestamp <= Date.now();
  
  await cleanupWatchParty(
    interaction.client,
    interaction.guild,
    endedWatchParty,
    { preserveWatchParty: hasViewingStarted },
  );
  
  if (hasViewingStarted) {
    await createWatchRatingMessage(interaction.client, endedWatchParty);
  }

  logger.info("Watch party ended", {
    guildId: endedWatchParty.guildId,
    channelId: endedWatchParty.channelId,
    messageId: endedWatchParty.messageId,
    mediaType: endedWatchParty.mediaType,
    mediaId: endedWatchParty.mediaId,
    title: endedWatchParty.title,
  });

  return {
    message: hasViewingStarted
      ? `✅ Diffusion terminée pour "${endedWatchParty.title}". Le vote est ouvert pendant 1h.`
      : `✅ Diffusion annulée pour "${endedWatchParty.title}".`,
  };
}

export async function handleDeletedWatchMessage(params: {
  messageId: string;
  guildId: string | null;
  guild?: Guild;
}): Promise<void> {
  const watchParty = await findWatchPartyByMessageId(params.messageId);

  if (!watchParty) {
    return;
  }

  if (
    watchParty.status === WATCH_CONSTANTS.ENDED_STATUS ||
    watchParty.ratingMessageId ||
    watchParty.ratingClosesAt
  ) {
    logger.info("Ignoring watch message deletion because watch party is already ended", {
      messageId: watchParty.messageId,
      guildId: watchParty.guildId,
      title: watchParty.title,
      status: watchParty.status,
      ratingMessageId: watchParty.ratingMessageId ?? null,
      ratingClosesAt: watchParty.ratingClosesAt ?? null,
    });
    return;
  }

  cancelWatchStartAnnouncement(watchParty.messageId);

  if (params.guild) {
    await cleanupSpectatorRolesForWatchParty(params.guild, watchParty);
  }

  await deleteWatchParty(watchParty.messageId);

  logger.info("Watch party deleted after main message deletion", {
    messageId: watchParty.messageId,
    guildId: watchParty.guildId,
    title: watchParty.title,
  });
}

export async function handleWatchTicketButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messageId = interaction.message.id;
  const { guild } = interaction;
  const userId = interaction.user.id;

  const watchParty = await findWatchPartyByMessageId(messageId);

  if (!watchParty) {
    await interaction.reply({
      content: "❌ Cette diffusion n'existe plus.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isAlreadyIn = watchParty.users.includes(userId);

  if (isAlreadyIn) {
    const updated = await removeUserFromWatchParty(messageId, userId);

    if (updated?.roleId) {
      const hasAnotherWatchParty = await userHasAnotherActiveWatchParty(guild.id, userId, messageId);

      if (!hasAnotherWatchParty) {
        await removeSpectatorRoleByUserId(guild, userId, updated.roleId, "User left watch party");
      }
    }

    await interaction.reply({
      content: "✅ Réservation annulée.",
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Watch party ticket removed", { guildId: guild.id, messageId, userId, title: watchParty.title });
  } else {
    const updated = await addUserToWatchParty(messageId, userId);

    if (updated?.roleId) {
      await addSpectatorRoleByUserId(guild, userId, updated.roleId, "User joined watch party");
    }

    await interaction.reply({
      content: `✅ Place réservée pour **${watchParty.title}** !`,
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Watch party ticket added", { guildId: guild.id, messageId, userId, title: watchParty.title });
  }
}

export async function handleWatchRatingButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette action doit être effectuée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ratingStr = interaction.customId.slice(WATCH_CONSTANTS.RATING_BUTTON_PREFIX.length);
  const rating = Number(ratingStr) as WatchRatingValue;

  if (!rating || rating < 1 || rating > 5) {
    await interaction.reply({
      content: "❌ Note invalide.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const messageId = interaction.message.id;
  const userId = interaction.user.id;

  const watchParty = await findWatchPartyByRatingMessageId(messageId);

  if (!watchParty) {
    await interaction.reply({
      content: "❌ Cette session de vote n'existe plus.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const currentRating = watchParty.ratings?.[userId];

  if (currentRating === rating) {
    const updated = await removeWatchPartyUserRating({
      ratingMessageId: messageId,
      userId,
    });

    if (!updated) {
      await interaction.reply({
        content: "❌ Impossible de supprimer ta note.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: "✅ Note retirée.",
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Watch rating removed", {
      guildId: interaction.guild.id,
      messageId,
      userId,
      title: updated.title,
      rating,
    });
  } else {
    const updated = await setWatchPartyUserRating({
      ratingMessageId: messageId,
      userId,
      rating,
    });

    if (!updated) {
      await interaction.reply({
        content: "❌ Impossible d'enregistrer ta note.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stars = "⭐".repeat(rating);

    await interaction.reply({
      content: `✅ Note enregistrée : ${stars}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.info("Watch rating stored", {
      guildId: interaction.guild.id,
      messageId,
      userId,
      title: updated.title,
      rating,
    });
  }
}