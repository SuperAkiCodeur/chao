import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { handleRouletteCommand } from "../services/roulette.service.js";

// Re-exports utilisés dans interactionCreate.event.ts
export { ROULETTE_SELECT_ID, ROULETTE_LAUNCH_PREFIX, ROULETTE_RETRY_ID } from "../domain/roulette.constants.js";

export const rouletteCommand = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Tire au sort un membre parmi une sélection"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleRouletteCommand(interaction);
  },
};
