import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { handleCinemaCommand } from "../services/cinema.service.js";

export const cinemaCommand = {
  data: new SlashCommandBuilder()
    .setName("cinema")
    .setDescription("Gère les diffusions de films et séries"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleCinemaCommand(interaction);
  },
};
