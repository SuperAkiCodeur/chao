import type { AnyAppEvent } from "./types/appEvent.js";
import { readyEvent } from "./events/ready.event.js";
import { watchMessageDeleteEvent } from "../../features/watch/events/watchMessageDelete.event.js";
import { watchReactionAddEvent } from "../../features/watch/events/watchReactionAdd.event.js";
import { watchReactionRemoveEvent } from "../../features/watch/events/watchReactionRemove.event.js";

export const eventRegistry = [
  readyEvent,
  watchMessageDeleteEvent,
  watchReactionAddEvent,
  watchReactionRemoveEvent,
] satisfies AnyAppEvent[];