import { Events, type Message, type PartialMessage } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { handleDeletedCinemaMessage } from "../services/cinema.service.js";

export const cinemaMessageDeleteEvent: AppEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,

  async execute(message: Message | PartialMessage): Promise<void> {
    try {
      await handleDeletedCinemaMessage({
        messageId: message.id,
        guildId: message.guildId ?? null,
        guild: message.guild ?? undefined,
      });
    } catch (error) {
      logger.error("[cinemaMessageDelete.event] error", {
        messageId: message.id,
        guildId: message.guildId ?? null,
        error,
      });
    }
  },
};