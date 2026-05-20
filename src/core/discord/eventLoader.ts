import { Client } from "discord.js";
import { logger } from "../app/logger.js";
import { handleVoiceStateUpdate } from "../../features/voice/events/voiceStateUpdate.event.js";

export function loadEvents(client: Client) {
  client.once("clientReady", () => {
    logger.info(`Connected as ${client.user?.tag ?? "unknown user"}`);
  });

  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      await handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
      logger.error("Failed to handle voiceStateUpdate event", error);
    }
  });
}