import type { Client } from "discord.js";
import { logger } from "../app/logger.js";
import { eventRegistry } from "./eventRegistry.js";

export function loadEvents(client: Client): void {
  for (const event of eventRegistry) {
    const execute = event.execute as (...args: unknown[]) => Promise<void>;

    const listener = async (...args: unknown[]) => {
      try {
        await execute(...args);
      } catch (error) {
        logger.error("Discord event failed", {
          event: event.name,
          error,
        });
      }
    };

    if (event.once) {
      client.once(event.name, listener);
      continue;
    }

    client.on(event.name, listener);
  }
}