import { VoiceState } from "discord.js";
import {
  handleTempChannelJoin,
  handleTempChannelLeave,
} from "../services/tempChannel.service.js";
import { syncChattingRoleFromVoiceState } from "../services/chattingRole.service.js";

export async function handleVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
) {
  if (oldState.channelId === newState.channelId) {
    return;
  }

  if (newState.channelId) {
    await handleTempChannelJoin(newState);
  }

  if (oldState.channelId) {
    await handleTempChannelLeave(oldState);
  }

  await syncChattingRoleFromVoiceState(oldState, newState);
}