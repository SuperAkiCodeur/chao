import { Events, type Message, type PartialMessage } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { handleDeletedWatchMessage } from "../services/watch.service.js";

export const watchMessageDeleteEvent: AppEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,

  async execute(message: Message | PartialMessage): Promise<void> {
    try {
      await handleDeletedWatchMessage({
        messageId: message.id,
        guildId: message.guildId ?? null,
        guild: message.guild ?? undefined,
      });
    } catch (error) {
      logger.error("[watchMessageDelete.event] error", {
        messageId: message.id,
        guildId: message.guildId ?? null,
        error,
      });
    }
  },
};