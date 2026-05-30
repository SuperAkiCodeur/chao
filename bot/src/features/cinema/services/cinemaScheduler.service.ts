import { AllowedMentionsTypes, Client, EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { CINEMA_CONSTANTS } from "../domain/cinema.constants.js";
import type { CinemaParty, CinemaRatingValue } from "../domain/cinema.types.js";
import {
  closeCinemaRatingSession,
  deleteCinemaParty,
  findCinemaPartyByMessageId,
  setCinemaStartAnnouncementMessageId,
} from "../repositories/cinema.repository.js";

const MAX_TIMEOUT_DELAY = 2_147_483_647;

const scheduledCinemaAnnouncements = new Map<string, NodeJS.Timeout>();
const scheduledCinemaRatingClosures = new Map<string, NodeJS.Timeout>();

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

function buildCinemaStartEmbed(cinemaParty: CinemaParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("🎬 La diffusion commence maintenant")
    .setDescription(`On regarde **${cinemaParty.title}**, rejoins-nous vite !`);
}

function formatAverageAsStars(average: number): string {
  const rounded = Math.round(average);
  const filledStars = "⭐".repeat(rounded);
  const emptyStars = "☆".repeat(Math.max(0, 5 - rounded));

  return `${filledStars}${emptyStars}`;
}

function buildCinemaRatingSummaryEmbed(
  cinemaParty: CinemaParty,
  ratings: Array<{ userId: string; rating: CinemaRatingValue }>,
): EmbedBuilder {
  const average =
    ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length;

  const usersList = ratings
    .sort((a, b) => b.rating - a.rating)
    .map((entry) => `<@${entry.userId}> — ${entry.rating}/5`)
    .join("\n");

  return new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`📊 Notes de ${cinemaParty.title}`)
    .setDescription(
      `**Moyenne :** ${average.toFixed(1)}/5\n**Étoiles :** ${formatAverageAsStars(average)}`,
    )
    .addFields({
      name: "Participants",
      value: usersList || "Aucune note reçue.",
    });
}

function buildCinemaRatingSummaryWithoutVotesEmbed(
  cinemaParty: CinemaParty,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(CINEMA_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`📊 Notes de ${cinemaParty.title}`)
    .setDescription("Aucune note n’a été enregistrée pendant les 24 heures de vote.");
}

async function sendScheduledCinemaAnnouncement(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<void> {
  const currentCinemaParty = await findCinemaPartyByMessageId(cinemaParty.messageId);

  if (!currentCinemaParty) {
    logger.warn("Unable to send scheduled cinema announcement: cinema party not found", {
      messageId: cinemaParty.messageId,
      title: cinemaParty.title,
    });
    return;
  }

  if (currentCinemaParty.startAnnouncementMessageId) {
    return;
  }

  const channel = await client.channels.fetch(currentCinemaParty.channelId).catch(() => null);

  if (!channel || !isSchedulableTextChannel(channel) || !channel.isTextBased()) {
    logger.warn("Unable to send scheduled cinema announcement: channel not found or not writable", {
      channelId: currentCinemaParty.channelId,
      messageId: currentCinemaParty.messageId,
      title: currentCinemaParty.title,
    });
    return;
  }

  const embed = buildCinemaStartEmbed(currentCinemaParty);

  const sentMessage = await channel.send({
    content: `<@&${currentCinemaParty.roleId}>`,
    embeds: [embed],
    allowedMentions: {
      roles: [currentCinemaParty.roleId],
      parse: [],
    },
  });

  await setCinemaStartAnnouncementMessageId(currentCinemaParty.messageId, sentMessage.id);

  logger.info("Scheduled cinema announcement sent", {
    guildId: currentCinemaParty.guildId,
    channelId: currentCinemaParty.channelId,
    messageId: currentCinemaParty.messageId,
    startAnnouncementMessageId: sentMessage.id,
    roleId: currentCinemaParty.roleId,
    title: currentCinemaParty.title,
  });
}

async function deleteRatingMessage(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<void> {
  if (!cinemaParty.ratingChannelId || !cinemaParty.ratingMessageId) {
    return;
  }

  const channel = await client.channels.fetch(cinemaParty.ratingChannelId).catch(() => null);

  if (!channel || !isFetchableMessageChannel(channel) || !channel.isTextBased()) {
    return;
  }

  const message = await channel.messages.fetch(cinemaParty.ratingMessageId).catch(() => null);

  if (!message) {
    return;
  }

  await message.delete().catch((error: unknown) => {
    logger.error("Failed to delete cinema rating message", {
      channelId: cinemaParty.ratingChannelId,
      ratingMessageId: cinemaParty.ratingMessageId,
      title: cinemaParty.title,
      error,
    });
  });
}

async function closeScheduledCinemaRating(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<void> {
  const currentCinemaParty = await findCinemaPartyByMessageId(cinemaParty.messageId);

  if (!currentCinemaParty) {
    logger.warn("Unable to close cinema rating: cinema party not found", {
      messageId: cinemaParty.messageId,
      title: cinemaParty.title,
    });
    return;
  }

  if (!currentCinemaParty.ratingChannelId) {
    logger.warn("Unable to close cinema rating: rating channel missing", {
      messageId: currentCinemaParty.messageId,
      title: currentCinemaParty.title,
    });
    return;
  }

  const channel = await client.channels.fetch(currentCinemaParty.ratingChannelId).catch(() => null);

  if (!channel || !isFetchableMessageChannel(channel) || !channel.isTextBased()) {
    logger.warn("Unable to close cinema rating: channel not found or not writable", {
      channelId: currentCinemaParty.ratingChannelId,
      messageId: currentCinemaParty.messageId,
      title: currentCinemaParty.title,
    });
    return;
  }

  await deleteRatingMessage(client, currentCinemaParty);

  const ratings = Object.entries(currentCinemaParty.ratings ?? {}).map(([userId, rating]) => {
    return {
      userId,
      rating,
    };
  }) as Array<{ userId: string; rating: CinemaRatingValue }>;

  const summaryEmbed =
    ratings.length > 0
      ? buildCinemaRatingSummaryEmbed(currentCinemaParty, ratings)
      : buildCinemaRatingSummaryWithoutVotesEmbed(currentCinemaParty);

  const summaryMessage = await channel.send({
    embeds: [summaryEmbed],
  });

  await closeCinemaRatingSession({
    messageId: currentCinemaParty.messageId,
    ratingSummaryMessageId: summaryMessage.id,
  });

  await deleteCinemaParty(currentCinemaParty.messageId);

  logger.info("Cinema rating closed and summary sent", {
    guildId: currentCinemaParty.guildId,
    channelId: currentCinemaParty.ratingChannelId,
    messageId: currentCinemaParty.messageId,
    ratingSummaryMessageId: summaryMessage.id,
    title: currentCinemaParty.title,
    ratingsCount: ratings.length,
  });
}

function clearScheduledCinemaAnnouncement(messageId: string): void {
  const timeout = scheduledCinemaAnnouncements.get(messageId);

  if (!timeout) {
    return;
  }

  clearTimeout(timeout);
  scheduledCinemaAnnouncements.delete(messageId);
}

function clearScheduledCinemaRatingClosure(messageId: string): void {
  const timeout = scheduledCinemaRatingClosures.get(messageId);

  if (!timeout) {
    return;
  }

  clearTimeout(timeout);
  scheduledCinemaRatingClosures.delete(messageId);
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

export function scheduleCinemaStartAnnouncement(
  client: Client,
  cinemaParty: CinemaParty,
): void {
  clearScheduledCinemaAnnouncement(cinemaParty.messageId);

  const viewingTimestamp = new Date(cinemaParty.viewingAt).getTime();

  if (Number.isNaN(viewingTimestamp)) {
    logger.error("Invalid cinema viewing date for scheduling", {
      messageId: cinemaParty.messageId,
      viewingAt: cinemaParty.viewingAt,
      title: cinemaParty.title,
    });
    return;
  }

  const delay = viewingTimestamp - Date.now();

  if (delay <= 0) {
    logger.info("Cinema viewing date already reached, sending announcement immediately", {
      messageId: cinemaParty.messageId,
      title: cinemaParty.title,
    });

    void sendScheduledCinemaAnnouncement(client, cinemaParty).finally(() => {
      scheduledCinemaAnnouncements.delete(cinemaParty.messageId);
    });
    return;
  }

  const timeout = scheduleWithChunkedTimeout(async () => {
    try {
      await sendScheduledCinemaAnnouncement(client, cinemaParty);
    } catch (error) {
      logger.error("Failed to send scheduled cinema announcement", {
        messageId: cinemaParty.messageId,
        title: cinemaParty.title,
        error,
      });
    } finally {
      scheduledCinemaAnnouncements.delete(cinemaParty.messageId);
    }
  }, delay);

  scheduledCinemaAnnouncements.set(cinemaParty.messageId, timeout);

  logger.info("Cinema announcement scheduled", {
    guildId: cinemaParty.guildId,
    channelId: cinemaParty.channelId,
    messageId: cinemaParty.messageId,
    title: cinemaParty.title,
    viewingAt: cinemaParty.viewingAt,
    delay,
  });
}

export function cancelCinemaStartAnnouncement(messageId: string): void {
  clearScheduledCinemaAnnouncement(messageId);
}

export async function triggerCinemaStartAnnouncement(
  client: Client,
  cinemaParty: CinemaParty,
): Promise<void> {
  clearScheduledCinemaAnnouncement(cinemaParty.messageId);
  await sendScheduledCinemaAnnouncement(client, cinemaParty);
}

export function scheduleCinemaRatingClosure(
  client: Client,
  cinemaParty: CinemaParty,
): void {
  clearScheduledCinemaRatingClosure(cinemaParty.messageId);

  if (!cinemaParty.ratingClosesAt) {
    logger.warn("Unable to schedule cinema rating closure: ratingClosesAt missing", {
      messageId: cinemaParty.messageId,
      title: cinemaParty.title,
    });
    return;
  }

  const closingTimestamp = new Date(cinemaParty.ratingClosesAt).getTime();

  if (Number.isNaN(closingTimestamp)) {
    logger.error("Invalid cinema rating closing date for scheduling", {
      messageId: cinemaParty.messageId,
      ratingClosesAt: cinemaParty.ratingClosesAt,
      title: cinemaParty.title,
    });
    return;
  }

  const delay = closingTimestamp - Date.now();

  if (delay <= 0) {
    logger.info("Cinema rating closing date already reached, closing immediately", {
      messageId: cinemaParty.messageId,
      title: cinemaParty.title,
    });

    void closeScheduledCinemaRating(client, cinemaParty).finally(() => {
      scheduledCinemaRatingClosures.delete(cinemaParty.messageId);
    });
    return;
  }

  const timeout = scheduleWithChunkedTimeout(async () => {
    try {
      await closeScheduledCinemaRating(client, cinemaParty);
    } catch (error) {
      logger.error("Failed to close scheduled cinema rating", {
        messageId: cinemaParty.messageId,
        title: cinemaParty.title,
        error,
      });
    } finally {
      scheduledCinemaRatingClosures.delete(cinemaParty.messageId);
    }
  }, delay);

  scheduledCinemaRatingClosures.set(cinemaParty.messageId, timeout);

  logger.info("Cinema rating closure scheduled", {
    guildId: cinemaParty.guildId,
    channelId: cinemaParty.ratingChannelId,
    messageId: cinemaParty.messageId,
    title: cinemaParty.title,
    ratingClosesAt: cinemaParty.ratingClosesAt,
    delay,
  });
}

export function cancelCinemaRatingClosure(messageId: string): void {
  clearScheduledCinemaRatingClosure(messageId);
}