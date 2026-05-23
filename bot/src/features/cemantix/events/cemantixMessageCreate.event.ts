import { Events, type Message } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import { handleCemantixGuess } from "../services/cemantix.service.js";

export const cemantixMessageCreateEvent: AppEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,

  async execute(message: Message): Promise<void> {
    // Only handle messages in the dedicated Cémantix channel
    const cemantixChannelId = await getSetting(SETTING_KEYS.CEMANTIX_CHANNEL_ID);
    if (!cemantixChannelId || message.channelId !== cemantixChannelId) {
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
