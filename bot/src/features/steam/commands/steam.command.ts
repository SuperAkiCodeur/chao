import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { handleSteamCommand } from "../services/steam.service.js";

export const steamCommand = {
  data: new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Gère la liste de jeux Steam du serveur"),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleSteamCommand(interaction);
  },
};
