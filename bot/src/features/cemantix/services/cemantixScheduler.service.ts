import type { Client } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";
import { startDailyCemantixGame } from "./cemantix.service.js";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let scheduledTimeout: NodeJS.Timeout | null = null;

// ---------------------------------------------------------------------------
// Time helper
// ---------------------------------------------------------------------------

/**
 * Returns the number of milliseconds until the next 8h00 in Paris timezone.
 *
 * Strategy: compute the time difference using Paris "local" Date objects.
 * When computing a duration (subtraction), the UTC offset cancels out,
 * so the result is always correct regardless of DST or server timezone.
 */
export function getMillisUntilNextDailyGame(): number {
  const now = new Date();

  // Represent current instant as a Date whose .getHours() etc. reflect Paris time
  const parisNow = new Date(
    now.toLocaleString("en-US", { timeZone: CEMANTIX_CONSTANTS.TIMEZONE }),
  );

  // Build today's 8h00 in that same "Paris as local" representation
  const target = new Date(parisNow);
  target.setHours(CEMANTIX_CONSTANTS.GAME_HOUR, 0, 0, 0);

  if (parisNow >= target) {
    // Already past 8h00 today — target tomorrow
    target.setDate(target.getDate() + 1);
  }

  // The difference is a pure duration and is correct
  return Math.max(0, target.getTime() - parisNow.getTime());
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Schedules the next daily Cémantix game.
 * After each trigger the next one is automatically re-scheduled.
 */
export function scheduleDailyCemantix(client: Client): void {
  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
  }

  const delayMs = getMillisUntilNextDailyGame();
  const scheduledFor = new Date(Date.now() + delayMs).toISOString();

  scheduledTimeout = setTimeout(() => {
    scheduledTimeout = null;

    void (async () => {
      try {
        await startDailyCemantixGame(client);
      } catch (error) {
        logger.error("[cemantix] Failed to start scheduled daily game", { error });
      } finally {
        // Always re-schedule for the following day
        scheduleDailyCemantix(client);
      }
    })();
  }, delayMs);

  logger.info("[cemantix] Next daily game scheduled", { scheduledFor, delayMs });
}

export function cancelDailyCemantix(): void {
  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
    scheduledTimeout = null;
  }
}
