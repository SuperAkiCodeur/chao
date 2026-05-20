import { AllowedMentionsTypes, Client, EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import type { WatchParty } from "../domain/watch.types.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import {
  findWatchPartyByMessageId,
  setWatchStartAnnouncementMessageId,
} from "../repositories/watch.repository.js";

const MAX_TIMEOUT_DELAY = 2_147_483_647;

const scheduledWatchAnnouncements = new Map<string, NodeJS.Timeout>();

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

function buildWatchStartEmbed(watchParty: WatchParty): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WATCH_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle("🎬 La diffusion commence maintenant")
    .setDescription(`On regarde **${watchParty.title}**, rejoins-nous vite !`);
}

async function sendScheduledWatchAnnouncement(
  client: Client,
  watchParty: WatchParty,
): Promise<void> {
  const currentWatchParty = findWatchPartyByMessageId(watchParty.messageId);

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

  setWatchStartAnnouncementMessageId(currentWatchParty.messageId, sentMessage.id);

  logger.info("Scheduled watch announcement sent", {
    guildId: currentWatchParty.guildId,
    channelId: currentWatchParty.channelId,
    messageId: currentWatchParty.messageId,
    startAnnouncementMessageId: sentMessage.id,
    roleId: currentWatchParty.roleId,
    title: currentWatchParty.title,
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

export function clearAllScheduledWatchAnnouncements(): void {
  for (const timeout of scheduledWatchAnnouncements.values()) {
    clearTimeout(timeout);
  }

  scheduledWatchAnnouncements.clear();
}