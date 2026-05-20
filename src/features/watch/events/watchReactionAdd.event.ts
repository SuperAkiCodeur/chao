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

      if (
        emojiName === WATCH_CONSTANTS.RATING_EMOJIS[1] ||
        emojiName === WATCH_CONSTANTS.RATING_EMOJIS[2] ||
        emojiName === WATCH_CONSTANTS.RATING_EMOJIS[3] ||
        emojiName === WATCH_CONSTANTS.RATING_EMOJIS[4] ||
        emojiName === WATCH_CONSTANTS.RATING_EMOJIS[5]
      ) {
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
        error,
      });
    }
  },
};