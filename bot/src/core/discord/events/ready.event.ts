import { Events } from "discord.js";
import type { AppEvent } from "../types/appEvent.js";
import { logger } from "../../app/logger.js";
import { findAllCinemaParties } from "../../../features/cinema/repositories/cinema.repository.js";
import { CINEMA_CONSTANTS } from "../../../features/cinema/domain/cinema.constants.js";
import {
  scheduleCinemaRatingClosure,
  scheduleCinemaStartAnnouncement,
} from "../../../features/cinema/services/cinemaScheduler.service.js";
import { scheduleBirthdayDailyCheck } from "../../../features/birthday/services/birthdayScheduler.service.js";
import { runStartupMigrations } from "../../db/migrations.js";
import { registerCommands } from "../registerCommands.js";

export const readyEvent: AppEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,

  async execute(client): Promise<void> {
    logger.info("Bot is ready", {
      userTag: client.user.tag,
      userId: client.user.id,
    });

    await runStartupMigrations();

    await registerCommands().catch((error: unknown) => {
      logger.error("Failed to register commands on startup", { error });
    });

    const cinemaParties = await findAllCinemaParties();

    const activeCinemaParties = cinemaParties.filter(
      (wp) => wp.status === CINEMA_CONSTANTS.ACTIVE_STATUS,
    );

    const cinemaPartiesWithOpenRatings = cinemaParties.filter((wp) =>
      Boolean(wp.ratingMessageId && wp.ratingChannelId && wp.ratingClosesAt),
    );

    for (const cinemaParty of activeCinemaParties) {
      scheduleCinemaStartAnnouncement(client, cinemaParty);
    }

    for (const cinemaParty of cinemaPartiesWithOpenRatings) {
      scheduleCinemaRatingClosure(client, cinemaParty);
    }

    logger.info("Cinema schedulers restored", {
      restoredCinemaAnnouncementsCount: activeCinemaParties.length,
      restoredCinemaRatingClosuresCount: cinemaPartiesWithOpenRatings.length,
    });

    scheduleBirthdayDailyCheck(client);
  },
};
