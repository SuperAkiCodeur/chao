import type { AnyAppEvent } from "./types/appEvent.js";
import { readyEvent } from "./events/ready.event.js";
import { interactionCreateEvent } from "./events/interactionCreate.event.js";
import { voiceStateUpdateEvent } from "../../features/voice/events/voiceStateUpdate.event.js";
import { watchMessageDeleteEvent } from "../../features/watch/events/watchMessageDelete.event.js";
import { cemantixMessageCreateEvent } from "../../features/cemantix/events/cemantixMessageCreate.event.js";
import { memberJoinEvent } from "../../features/members/events/memberJoin.event.js";

export const eventRegistry = [
  readyEvent,
  interactionCreateEvent,
  voiceStateUpdateEvent,
  watchMessageDeleteEvent,
  cemantixMessageCreateEvent,
  memberJoinEvent,
] satisfies AnyAppEvent[];