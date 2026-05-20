import { Events, type VoiceState } from "discord.js";
import type { AppEvent } from "../../../core/discord/types/appEvent.js";
import {
  handleTempChannelJoin,
  handleTempChannelLeave,
} from "../services/tempChannel.service.js";
import { syncChattingRoleFromVoiceState } from "../services/chattingRole.service.js";

export const voiceStateUpdateEvent: AppEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,

  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (oldState.channelId === newState.channelId) {
      return;
    }

    if (newState.channelId) {
      await handleTempChannelJoin(newState);
    }

    await syncChattingRoleFromVoiceState(oldState, newState);

    if (oldState.channelId) {
      await handleTempChannelLeave(oldState);
    }
  },
};