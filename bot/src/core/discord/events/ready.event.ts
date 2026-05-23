import { Events } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { findAllWatchParties } from "../../../features/watch/repositories/watch.repository.js";
import { WATCH_CONSTANTS } from "../../../features/watch/domain/watch.constants.js";
import {
  scheduleWatchRatingClosure,
  scheduleWatchStartAnnouncement,
} from "../../../features/watch/services/watchScheduler.service.js";
import { restoreCemantixState } from "../../../features/cemantix/services/cemantix.service.js";
import { scheduleDailyCemantix } from "../../../features/cemantix/services/cemantixScheduler.service.js";

export const readyEvent: AppEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(client): Promise<void> {
    logger.info("Bot is ready", {
      userTag: client.user.tag,
      userId: client.user.id,
    });

    const watchParties = await findAllWatchParties();

    const activeWatchParties = watchParties.filter(
      (wp) => wp.status === WATCH_CONSTANTS.ACTIVE_STATUS,
    );

    const watchPartiesWithOpenRatings = watchParties.filter((wp) =>
      Boolean(wp.ratingMessageId && wp.ratingChannelId && wp.ratingClosesAt),
    );

    for (const watchParty of activeWatchParties) {
      scheduleWatchStartAnnouncement(client, watchParty);
    }

    for (const watchParty of watchPartiesWithOpenRatings) {
      scheduleWatchRatingClosure(client, watchParty);
    }

    logger.info("Watch schedulers restored", {
      restoredWatchAnnouncementsCount: activeWatchParties.length,
      restoredWatchRatingClosuresCount: watchPartiesWithOpenRatings.length,
    });

    // ── Cémantix ────────────────────────────────────────────────────────────
    await restoreCemantixState(client);
    scheduleDailyCemantix(client);
  },
};
