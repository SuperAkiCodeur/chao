import { Events } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { readWatchParties } from "../../../features/watch/repositories/watch.repository.js";
import { scheduleWatchStartAnnouncement } from "../../../features/watch/services/watchScheduler.service.js";
import { WATCH_CONSTANTS } from "../../../features/watch/domain/watch.constants.js";

export const readyEvent: AppEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(client): Promise<void> {
    logger.info("Bot is ready", {
      userTag: client.user.tag,
      userId: client.user.id,
    });

    const data = readWatchParties();
    const activeWatchParties = Object.values(data.watchParties).filter(
      (watchParty) => watchParty.status === WATCH_CONSTANTS.ACTIVE_STATUS,
    );

    for (const watchParty of activeWatchParties) {
      scheduleWatchStartAnnouncement(client, watchParty);
    }

    logger.info("Watch announcements restored", {
      restoredCount: activeWatchParties.length,
    });
  },
};