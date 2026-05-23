import { Events, type Message } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { env } from "../../../core/config/env.js";
import { handleCemantixGuess } from "../services/cemantix.service.js";

export const cemantixMessageCreateEvent: AppEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(message: Message): Promise<void> {
    // Only handle messages in the dedicated Cémantix channel
    if (!env.CEMANTIX_CHANNEL_ID || message.channelId !== env.CEMANTIX_CHANNEL_ID) {
      return;
    }

    // Ignore bots (including self)
    if (message.author.bot) {
      return;
    }

    // Must be a guild message (need guild context for member info)
    if (!message.inGuild()) {
      return;
    }

    try {
      await handleCemantixGuess(message);
    } catch (error) {
      logger.error("[cemantix] Unhandled error in messageCreate handler", {
        userId: message.author.id,
        content: message.content.slice(0, 50),
        error,
      });
    }
  },
};
