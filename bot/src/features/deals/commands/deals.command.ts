import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { handleDealsCommand } from "../services/deals.service.js";

export const dealsCommand = {
  data: new SlashCommandBuilder()
    .setName("deals")
    .setDescription("Gère la liste de jeux et alertes promotions du serveur"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleDealsCommand(interaction);
  },
};
