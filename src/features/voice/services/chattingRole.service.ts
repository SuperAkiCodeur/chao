import type { VoiceState } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { VOICE_CONSTANTS } from "../domain/voice.constants.js";

function isTrackedTemporaryChannelName(channelName: string | null | undefined): boolean {
  if (!channelName) {
    return false;
  }

  return channelName.startsWith(VOICE_CONSTANTS.TEMP_CHANNEL_PREFIX);
}

export async function syncChattingRoleFromVoiceState(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const member = newState.member ?? oldState.member;

  if (!member || member.user.bot) {
    return;
  }

  const hasChattingRole = member.roles.cache.has(VOICE_CONSTANTS.CHATTING_ROLE_ID);
  const joinedTemporaryChannel = isTrackedTemporaryChannelName(newState.channel?.name);
  const leftTemporaryChannel = isTrackedTemporaryChannelName(oldState.channel?.name);
  const isNowOutsideVoice = !newState.channelId;

  if (joinedTemporaryChannel && !hasChattingRole) {
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

  if (hasChattingRole && (isNowOutsideVoice || !joinedTemporaryChannel)) {
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