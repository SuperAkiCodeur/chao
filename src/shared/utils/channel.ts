import { ChannelType, VoiceChannel } from "discord.js";
import { VOICE_CONSTANTS } from "../../features/voice/domain/voice.constants.js";

export function isGuildVoiceChannel(channel: unknown): channel is VoiceChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "type" in channel &&
    channel.type === ChannelType.GuildVoice
  );
}

export function isTemporaryVoiceChannel(channel: VoiceChannel): boolean {
  return channel.name.startsWith(VOICE_CONSTANTS.TEMP_CHANNEL_PREFIX);
}