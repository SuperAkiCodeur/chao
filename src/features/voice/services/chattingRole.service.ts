import type { VoiceState } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { VOICE_CONSTANTS } from "../domain/voice.constants.js";
import { isTemporaryVoiceChannel } from "./tempChannel.service.js";

export async function syncChattingRoleFromVoiceState(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const member = newState.member ?? oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const wasInTempChannel = isTemporaryVoiceChannel(oldState.channelId);
  const isInTempChannel = isTemporaryVoiceChannel(newState.channelId);
  const hasChattingRole = member.roles.cache.has(VOICE_CONSTANTS.CHATTING_ROLE_ID);

  if (!wasInTempChannel && isInTempChannel && !hasChattingRole) {
    await member.roles.add(
      VOICE_CONSTANTS.CHATTING_ROLE_ID,
      "User joined a temporary voice channel",
    );

    logger.info("Chatting role added", {
      guildId: member.guild.id,
      userId: member.id,
      roleId: VOICE_CONSTANTS.CHATTING_ROLE_ID,
      channelId: newState.channelId,
    });

    return;
  }

  if (wasInTempChannel && !isInTempChannel && hasChattingRole) {
    await member.roles.remove(
      VOICE_CONSTANTS.CHATTING_ROLE_ID,
      "User left temporary voice channel",
    );

    logger.info("Chatting role removed", {
      guildId: member.guild.id,
      userId: member.id,
      roleId: VOICE_CONSTANTS.CHATTING_ROLE_ID,
      channelId: oldState.channelId,
    });
  }
}