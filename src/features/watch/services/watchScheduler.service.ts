import { AllowedMentionsTypes, Client, EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import type { WatchParty, WatchRatingValue } from "../domain/watch.types.js";
import {
  closeWatchRatingSession,
  deleteWatchParty,
  findWatchPartyByMessageId,
  setWatchStartAnnouncementMessageId,
} from "../repositories/watch.repository.js";

const MAX_TIMEOUT_DELAY = 2_147_483_647;

const scheduledWatchAnnouncements = new Map<string, NodeJS.Timeout>();
const scheduledWatchRatingClosures = new Map<string, NodeJS.Timeout>();

type SchedulableTextChannel = {
  send: (options: {
    content?: string;
    embeds?: EmbedBuilder[];
    allowedMentions?: {
      roles?: string[];
      parse?: AllowedMentionsTypes[];
    };
  }) => Promise<{ id: string }>;
};

type FetchableMessageChannel = {
  isTextBased: () => boolean;
  send: (options: { embeds: EmbedBuilder[] }) => Promise<{ id: string }>;
  messages: {
    fetch: (messageId: string) => Promise<{
      delete: () => Promise<unknown>;
    }>;
  };
};

function isSchedulableTextChannel(channel: unknown): channel is SchedulableTextChannel & {
  isTextBased: () => boolean;
} {
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

function isFetchableMessageChannel(channel: unknown): channel is FetchableMessageChannel {
  if (!channel || typeof channel !== "object") {
    return false;
  }

  if (!("isTextBased" in channel) || !("send" in channel) || !("messages" in channel)) {
    return false;
  }

  const candidate = channel as {
    isTextBased?: unknown;
    send?: unknown;
    messages?: { fetch?: unknown };
  };

  return (
    typeof candidate.isTextBased === "function" &&
    typeof candidate.send === "function" &&
    typeof candidate.messages?.fetch === "function"
  );
}

function buildWatchStartEmbed(watchParty: WatchParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("🎬 La diffusion commence maintenant")
    .setDescription(`On regarde **${watchParty.title}**, rejoins-nous vite !`);
}

function formatAverageAsStars(average: number): string {
  const rounded = Math.round(average);
  const filledStars = "⭐".repeat(rounded);
  const emptyStars = "☆".repeat(Math.max(0, 5 - rounded));

  return `${filledStars}${emptyStars}`;
}

function buildWatchRatingSummaryEmbed(
  watchParty: WatchParty,
  ratings: Array<{ userId: string; rating: WatchRatingValue }>,
): EmbedBuilder {
  const average =
    ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length;

  const usersList = ratings
    .sort((a, b) => b.rating - a.rating)
    .map((entry) => `<@${entry.userId}> — ${entry.rating}/5`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`📊 Notes de ${watchParty.title}`)
    .setDescription(
      `**Moyenne :** ${average.toFixed(1)}/5\n**Étoiles :** ${formatAverageAsStars(average)}`,
    )
    .addFields({
      name: "Participants",
      value: usersList || "Aucune note reçue.",
    });
}

function buildWatchRatingSummaryWithoutVotesEmbed(
  watchParty: WatchParty,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`📊 Notes de ${watchParty.title}`)
    .setDescription("Aucune note n’a été enregistrée pendant les 24 heures de vote.");
}

async function sendScheduledWatchAnnouncement(
  client: Client,
  watchParty: WatchParty,
): Promise<void> {
  const currentWatchParty = await findWatchPartyByMessageId(watchParty.messageId);

  if (!currentWatchParty) {
    logger.warn("Unable to send scheduled watch announcement: watch party not found", {
      messageId: watchParty.messageId,
      title: watchParty.title,
    });
    return;
  }

  if (currentWatchParty.startAnnouncementMessageId) {
    logger.info("Scheduled watch announcement already sent", {
      messageId: currentWatchParty.messageId,
      startAnnouncementMessageId: currentWatchParty.startAnnouncementMessageId,
      title: currentWatchParty.title,
    });
    return;
  }

  const channel = await client.channels.fetch(currentWatchParty.channelId).catch(() => null);

  if (!channel || !isSchedulableTextChannel(channel) || !channel.isTextBased()) {
    logger.warn("Unable to send scheduled watch announcement: channel not found or not writable", {
      channelId: currentWatchParty.channelId,
      messageId: currentWatchParty.messageId,
      title: currentWatchParty.title,
    });
    return;
  }

  const embed = buildWatchStartEmbed(currentWatchParty);

  const sentMessage = await channel.send({
    content: `<@&${currentWatchParty.roleId}>`,
    embeds: [embed],
    allowedMentions: {
      roles: [currentWatchParty.roleId],
      parse: [],
    },
  });

  await setWatchStartAnnouncementMessageId(currentWatchParty.messageId, sentMessage.id);

  logger.info("Scheduled watch announcement sent", {
    guildId: currentWatchParty.guildId,
    channelId: currentWatchParty.channelId,
    messageId: currentWatchParty.messageId,
    startAnnouncementMessageId: sentMessage.id,
    roleId: currentWatchParty.roleId,
    title: currentWatchParty.title,
  });
}

async function deleteRatingMessage(
  client: Client,
  watchParty: WatchParty,
): Promise<void> {
  if (!watchParty.ratingChannelId || !watchParty.ratingMessageId) {
    return;
  }

  const channel = await client.channels.fetch(watchParty.ratingChannelId).catch(() => null);

  if (!channel || !isFetchableMessageChannel(channel) || !channel.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(watchParty.ratingMessageId).catch(() => null);

  if (!message) {
    return;
  }

  await message.delete().catch((error: unknown) => {
    logger.error("Failed to delete watch rating message", {
      channelId: watchParty.ratingChannelId,
      ratingMessageId: watchParty.ratingMessageId,
      title: watchParty.title,
      error,
    });
  });
}

async function closeScheduledWatchRating(
  client: Client,
  watchParty: WatchParty,
): Promise<void> {
  const currentWatchParty = await findWatchPartyByMessageId(watchParty.messageId);

  if (!currentWatchParty) {
    logger.warn("Unable to close watch rating: watch party not found", {
      messageId: watchParty.messageId,
      title: watchParty.title,
    });
    return;
  }

  if (!currentWatchParty.ratingChannelId) {
    logger.warn("Unable to close watch rating: rating channel missing", {
      messageId: currentWatchParty.messageId,
      title: currentWatchParty.title,
    });
    return;
  }

  const channel = await client.channels.fetch(currentWatchParty.ratingChannelId).catch(() => null);

  if (!channel || !isFetchableMessageChannel(channel) || !channel.isTextBased()) {
    logger.warn("Unable to close watch rating: channel not found or not writable", {
      channelId: currentWatchParty.ratingChannelId,
      messageId: currentWatchParty.messageId,
      title: currentWatchParty.title,
    });
    return;
  }

  await deleteRatingMessage(client, currentWatchParty);

  const ratings = Object.entries(currentWatchParty.ratings ?? {}).map(([userId, rating]) => {
    return {
      userId,
      rating,
    };
  }) as Array<{ userId: string; rating: WatchRatingValue }>;

  const summaryEmbed =
    ratings.length > 0
      ? buildWatchRatingSummaryEmbed(currentWatchParty, ratings)
      : buildWatchRatingSummaryWithoutVotesEmbed(currentWatchParty);

  const summaryMessage = await channel.send({
    embeds: [summaryEmbed],
  });

  await closeWatchRatingSession({
    messageId: currentWatchParty.messageId,
    ratingSummaryMessageId: summaryMessage.id,
  });

  await deleteWatchParty(currentWatchParty.messageId);

  logger.info("Watch rating closed and summary sent", {
    guildId: currentWatchParty.guildId,
    channelId: currentWatchParty.ratingChannelId,
    messageId: currentWatchParty.messageId,
    ratingSummaryMessageId: summaryMessage.id,
    title: currentWatchParty.title,
    ratingsCount: ratings.length,
  });
}

function clearScheduledWatchAnnouncement(messageId: string): void {
  const timeout = scheduledWatchAnnouncements.get(messageId);

  if (!timeout) {
    return;
  }

  clearTimeout(timeout);
  scheduledWatchAnnouncements.delete(messageId);
}

function clearScheduledWatchRatingClosure(messageId: string): void {
  const timeout = scheduledWatchRatingClosures.get(messageId);

  if (!timeout) {
    return;
  }

  clearTimeout(timeout);
  scheduledWatchRatingClosures.delete(messageId);
}

function scheduleWithChunkedTimeout(
  callback: () => Promise<void>,
  delay: number,
): NodeJS.Timeout {
  if (delay <= MAX_TIMEOUT_DELAY) {
    return setTimeout(() => {
      void callback();
    }, delay);
  }

  return setTimeout(() => {
    void scheduleWithChunkedTimeout(
      callback,
      delay - MAX_TIMEOUT_DELAY,
    );
  }, MAX_TIMEOUT_DELAY);
}

export function scheduleWatchStartAnnouncement(
  client: Client,
  watchParty: WatchParty,
): void {
  clearScheduledWatchAnnouncement(watchParty.messageId);

  const viewingTimestamp = new Date(watchParty.viewingAt).getTime();

  if (Number.isNaN(viewingTimestamp)) {
    logger.error("Invalid watch viewing date for scheduling", {
      messageId: watchParty.messageId,
      viewingAt: watchParty.viewingAt,
      title: watchParty.title,
    });
    return;
  }

  const delay = viewingTimestamp - Date.now();

  if (delay <= 0) {
    logger.info("Watch viewing date already reached, sending announcement immediately", {
      messageId: watchParty.messageId,
      title: watchParty.title,
    });

    void sendScheduledWatchAnnouncement(client, watchParty).finally(() => {
      scheduledWatchAnnouncements.delete(watchParty.messageId);
    });
    return;
  }

  const timeout = scheduleWithChunkedTimeout(async () => {
    try {
      await sendScheduledWatchAnnouncement(client, watchParty);
    } catch (error) {
      logger.error("Failed to send scheduled watch announcement", {
        messageId: watchParty.messageId,
        title: watchParty.title,
        error,
      });
    } finally {
      scheduledWatchAnnouncements.delete(watchParty.messageId);
    }
  }, delay);

  scheduledWatchAnnouncements.set(watchParty.messageId, timeout);

  logger.info("Watch announcement scheduled", {
    guildId: watchParty.guildId,
    channelId: watchParty.channelId,
    messageId: watchParty.messageId,
    title: watchParty.title,
    viewingAt: watchParty.viewingAt,
    delay,
  });
}

export function cancelWatchStartAnnouncement(messageId: string): void {
  clearScheduledWatchAnnouncement(messageId);
}

export function scheduleWatchRatingClosure(
  client: Client,
  watchParty: WatchParty,
): void {
  clearScheduledWatchRatingClosure(watchParty.messageId);

  if (!watchParty.ratingClosesAt) {
    logger.warn("Unable to schedule watch rating closure: ratingClosesAt missing", {
      messageId: watchParty.messageId,
      title: watchParty.title,
    });
    return;
  }

  const closingTimestamp = new Date(watchParty.ratingClosesAt).getTime();

  if (Number.isNaN(closingTimestamp)) {
    logger.error("Invalid watch rating closing date for scheduling", {
      messageId: watchParty.messageId,
      ratingClosesAt: watchParty.ratingClosesAt,
      title: watchParty.title,
    });
    return;
  }

  const delay = closingTimestamp - Date.now();

  if (delay <= 0) {
    logger.info("Watch rating closing date already reached, closing immediately", {
      messageId: watchParty.messageId,
      title: watchParty.title,
    });

    void closeScheduledWatchRating(client, watchParty).finally(() => {
      scheduledWatchRatingClosures.delete(watchParty.messageId);
    });
    return;
  }

  const timeout = scheduleWithChunkedTimeout(async () => {
    try {
      await closeScheduledWatchRating(client, watchParty);
    } catch (error) {
      logger.error("Failed to close scheduled watch rating", {
        messageId: watchParty.messageId,
        title: watchParty.title,
        error,
      });
    } finally {
      scheduledWatchRatingClosures.delete(watchParty.messageId);
    }
  }, delay);

  scheduledWatchRatingClosures.set(watchParty.messageId, timeout);

  logger.info("Watch rating closure scheduled", {
    guildId: watchParty.guildId,
    channelId: watchParty.ratingChannelId,
    messageId: watchParty.messageId,
    title: watchParty.title,
    ratingClosesAt: watchParty.ratingClosesAt,
    delay,
  });
}

export function cancelWatchRatingClosure(messageId: string): void {
  clearScheduledWatchRatingClosure(messageId);
}