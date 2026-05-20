import { ChannelType, VoiceState } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { VOICE_CONSTANTS } from "../domain/voice.constants.js";

export async function handleTempChannelJoin(state: VoiceState) {
  const joinedChannel = state.channel;

  if (!joinedChannel) {
    return;
  }

  if (joinedChannel.id !== VOICE_CONSTANTS.TRIGGER_CHANNEL_ID) {
    return;
  }

  const member = state.member;

  if (!member) {
    logger.warn("VoiceState member is missing on join", {
      guildId: state.guild.id,
      userId: state.id,
    });
    return;
  }

  const tempChannel = await state.guild.channels.create({
    name: `${VOICE_CONSTANTS.TEMP_CHANNEL_PREFIX} ${member.displayName}`,
    type: ChannelType.GuildVoice,
    parent: joinedChannel.parent,
  });

  await member.voice.setChannel(tempChannel);

  logger.info("Temporary voice channel created", {
    guildId: state.guild.id,
    channelId: tempChannel.id,
    ownerId: member.id,
  });
}

export async function handleTempChannelLeave(state: VoiceState) {
  const leftChannel = state.channel;

  if (!leftChannel) {
    return;
  }

  if (leftChannel.id === VOICE_CONSTANTS.TRIGGER_CHANNEL_ID) {
    return;
  }

  if (!leftChannel.name.startsWith(VOICE_CONSTANTS.TEMP_CHANNEL_PREFIX)) {
    return;
  }

  if (leftChannel.members.size > 0) {
    return;
  }

  await leftChannel.delete();

  logger.info("Temporary voice channel deleted", {
    guildId: state.guild.id,
    channelId: leftChannel.id,
  });
}