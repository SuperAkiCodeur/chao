import { ChannelType, VoiceChannel, VoiceState } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { VOICE_CONSTANTS } from "../domain/voice.constants.js";

const temporaryVoiceChannelIds = new Set<string>();

export function registerTemporaryVoiceChannel(channelId: string): void {
  temporaryVoiceChannelIds.add(channelId);
}

export function unregisterTemporaryVoiceChannel(channelId: string): void {
  temporaryVoiceChannelIds.delete(channelId);
}

export function isTemporaryVoiceChannel(channelId: string | null | undefined): boolean {
  if (!channelId) {
    return false;
  }

  return temporaryVoiceChannelIds.has(channelId);
}

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

  let tempChannel: VoiceChannel | null = null;

  try {
    tempChannel = await state.guild.channels.create({
      name: `${VOICE_CONSTANTS.TEMP_CHANNEL_PREFIX} ${member.displayName}`,
      type: ChannelType.GuildVoice,
      parent: joinedChannel.parent,
    });

    registerTemporaryVoiceChannel(tempChannel.id);

    await member.voice.setChannel(tempChannel);

    logger.info("Temporary voice channel created", {
      guildId: state.guild.id,
      channelId: tempChannel.id,
      ownerId: member.id,
    });
  } catch (error) {
    if (tempChannel) {
      unregisterTemporaryVoiceChannel(tempChannel.id);
      await tempChannel.delete().catch(() => null);
    }

    logger.error("Failed to create or assign temporary voice channel", {
      guildId: state.guild.id,
      userId: state.id,
      error,
    });
  }
}

export async function handleTempChannelLeave(state: VoiceState) {
  const leftChannel = state.channel;

  if (!leftChannel) {
    return;
  }

  if (leftChannel.id === VOICE_CONSTANTS.TRIGGER_CHANNEL_ID) {
    return;
  }

  if (!isTemporaryVoiceChannel(leftChannel.id)) {
    return;
  }

  if (leftChannel.members.size > 0) {
    return;
  }

  unregisterTemporaryVoiceChannel(leftChannel.id);

  await leftChannel.delete();

  logger.info("Temporary voice channel deleted", {
    guildId: state.guild.id,
    channelId: leftChannel.id,
  });
}