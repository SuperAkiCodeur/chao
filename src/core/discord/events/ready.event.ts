import { Events } from "discord.js";
import type { AppEvent } from "./../types/appEvent.js";
import { logger } from "../../app/logger.js";

export const readyEvent: AppEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client): Promise<void> {
    logger.info("Bot is ready", {
      userTag: client.user.tag,
      userId: client.user.id,
    });
  },
};