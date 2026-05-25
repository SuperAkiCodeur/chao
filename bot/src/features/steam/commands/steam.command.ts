import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { handleSteamCommand } from "../services/steam.service.js";

export const steamCommand = {
  data: new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Gère la liste de jeux Steam du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Ajoute un jeu Steam à la liste du serveur")
        .addStringOption((opt) =>
          opt
            .setName("titre")
            .setDescription("Nom du jeu à rechercher sur Steam")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("Affiche la liste des jeux trackés avec leurs prix"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("prix")
        .setDescription("Compare les prix d'un jeu sur Steam et les revendeurs")
        .addStringOption((opt) =>
          opt
            .setName("titre")
            .setDescription("Jeu à comparer (choisis dans la liste)")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Retire un jeu de la liste")
        .addStringOption((opt) =>
          opt
            .setName("titre")
            .setDescription("Jeu à retirer (choisis dans la liste)")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName("promos").setDescription("Affiche les jeux de la liste actuellement en promo"),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await handleSteamCommand(interaction);
  },
};
