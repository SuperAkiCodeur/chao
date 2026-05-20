export interface TempChannelData {
    channelId: string;
    guildId: string;
    ownerId: string;
}
  
export type VoiceStateChangeType = "join" | "leave" | "move" | "unknown";