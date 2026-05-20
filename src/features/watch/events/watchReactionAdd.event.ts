import {
  Events,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import { logger } from "../../../core/app/logger.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import { handleWatchReactionAdd } from "../services/watch.service.js";

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<MessageReaction | null> {
  if (!reaction.partial) {
    return reaction;
  }

  return reaction.fetch().catch(() => null);
}

export const watchReactionAddEvent: AppEvent<Events.MessageReactionAdd> = {
  name: Events.MessageReactionAdd,

  async execute(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    try {
      if (user.bot) {
        return;
      }

      const resolvedReaction = await resolveReaction(reaction);

      if (!resolvedReaction) {
        return;
      }

      if (resolvedReaction.emoji.name !== WATCH_CONSTANTS.TICKET_EMOJI) {
        return;
      }

      const { message } = resolvedReaction;
      const { guild } = message;

      if (!guild) {
        return;
      }

      await handleWatchReactionAdd({
        guild,
        messageId: message.id,
        userId: user.id,
      });
    } catch (error) {
      logger.error("[watchReactionAdd.event] error", {
        userId: user.id,
        reactionEmoji: reaction.emoji.name ?? null,
        error,
      });
    }
  },
};