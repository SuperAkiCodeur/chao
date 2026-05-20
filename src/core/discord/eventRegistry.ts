import type { AnyAppEvent } from "./types/appEvent.js";
import { readyEvent } from "./events/ready.event.js";
import { interactionCreateEvent } from "./events/interactionCreate.event.js";
import { voiceStateUpdateEvent } from "../../features/voice/events/voiceStateUpdate.event.js";
import { watchMessageDeleteEvent } from "../../features/watch/events/watchMessageDelete.event.js";
import { watchReactionAddEvent } from "../../features/watch/events/watchReactionAdd.event.js";
import { watchReactionRemoveEvent } from "../../features/watch/events/watchReactionRemove.event.js";

export const eventRegistry = [
  readyEvent,
  interactionCreateEvent,
  voiceStateUpdateEvent,
  watchMessageDeleteEvent,
  watchReactionAddEvent,
  watchReactionRemoveEvent,
] satisfies AnyAppEvent[];