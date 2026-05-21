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
import {
  handleWatchRatingReactionAdd,
  handleWatchReactionAdd,
} from "../services/watch.service.js";

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction,
): Promise<MessageReaction | null> {
  if (!reaction.partial) {
    return reaction;
  }

  return reaction.fetch().catch((error) => {
    logger.error("[watchReactionAdd.event] failed to fetch partial reaction", {
      messageId: reaction.message.id,
      error,
    });

    return null;
  });
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

      const emojiName = resolvedReaction.emoji.name;

      if (!emojiName) {
        return;
      }

      const { message } = resolvedReaction;
      const { guild } = message;

      if (!guild) {
        return;
      }

      if (emojiName === WATCH_CONSTANTS.TICKET_EMOJI) {
        await handleWatchReactionAdd({
          guild,
          messageId: message.id,
          userId: user.id,
        });

        return;
      }

      if (Object.values(WATCH_CONSTANTS.RATING_EMOJIS).includes(emojiName as never)) {
        await handleWatchRatingReactionAdd({
          guild,
          reaction: resolvedReaction,
          messageId: message.id,
          userId: user.id,
          emoji: emojiName,
        });
      }
    } catch (error) {
      logger.error("[watchReactionAdd.event] error", {
        userId: user.id,
        reactionEmoji: reaction.emoji.name ?? null,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
    }
  },
};
