import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { handleValorantCommand } from "../services/valorant.service.js";

export const valorantCommand = {
  data: new SlashCommandBuilder()
    .setName("valorant")
    .setDescription("Commandes Valorant du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleValorantCommand(interaction);
  },
};
