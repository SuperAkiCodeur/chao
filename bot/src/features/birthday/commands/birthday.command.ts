import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { BIRTHDAY_CONSTANTS } from "../domain/birthday.constants.js";
import { handleBirthdayCommand } from "../services/birthday.service.js";

export const birthdayCommand = {
  data: new SlashCommandBuilder()
    .setName(BIRTHDAY_CONSTANTS.COMMAND_NAME)
    .setDescription("Enregistre ton anniversaire, ou supprime-le s'il est déjà enregistré"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleBirthdayCommand(interaction);
  },
};
