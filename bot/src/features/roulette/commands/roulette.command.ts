import {
  ActionRowBuilder,
  MessageFlags,
  SlashCommandBuilder,
  UserSelectMenuBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { ROULETTE_CONSTANTS, ROULETTE_SELECT_ID } from "../domain/roulette.constants.js";

// Les IDs sont désormais centralisés dans roulette.constants.ts
export { ROULETTE_SELECT_ID, ROULETTE_LAUNCH_PREFIX } from "../domain/roulette.constants.js";

export const rouletteCommand = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Tire au sort un membre parmi une sélection"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(ROULETTE_SELECT_ID)
        .setPlaceholder(
          `Sélectionne ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS}–${ROULETTE_CONSTANTS.MAX_PARTICIPANTS} participants`,
        )
        .setMinValues(ROULETTE_CONSTANTS.MIN_PARTICIPANTS)
        .setMaxValues(ROULETTE_CONSTANTS.MAX_PARTICIPANTS),
    );

    await interaction.reply({
      content: "🎰 **Roulette** — Qui participe au tirage ?",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
