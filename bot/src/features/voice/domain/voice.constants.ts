import { env } from "../../../core/config/env.js";

export const VOICE_CONSTANTS = {
  TRIGGER_CHANNEL_ID: env.VOICE_TRIGGER_CHANNEL_ID,
  TEMP_CHANNEL_PREFIX: "💬・Salon de",
  CHATTING_ROLE_ID: env.VOICE_CHATTING_ROLE_ID,
} as const;