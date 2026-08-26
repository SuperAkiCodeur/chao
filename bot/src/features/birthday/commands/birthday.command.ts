import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { BIRTHDAY_CONSTANTS } from "../domain/birthday.constants.js";
import { handleBirthdayCommand } from "../services/birthday.service.js";

export const birthdayCommand = {
  data: new SlashCommandBuilder()
    .setName(BIRTHDAY_CONSTANTS.COMMAND_NAME)
    .setDescription("Gère ton anniversaire")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Enregistre la date de ton anniversaire"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("supprimer")
        .setDescription("Supprime ton anniversaire enregistré"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("liste")
        .setDescription("Affiche les prochains anniversaires"),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleBirthdayCommand(interaction);
  },
};
