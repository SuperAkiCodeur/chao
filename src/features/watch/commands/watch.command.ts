import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import type { WatchContentType } from "../domain/watch.types.js";
import { endWatchParty, startWatchParty } from "../services/watch.service.js";

export const watchCommand = {
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Gère les diffusions de films et séries")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Programme une diffusion pour un film ou une série")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type de contenu")
            .setRequired(true)
            .addChoices(
              { name: "Film", value: "movie" },
              { name: "Série", value: "tv" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Titre du film ou de la série")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("date")
            .setDescription("Date du visionnage (ex: 19/05/26)")
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName("time")
            .setDescription("Heure du visionnage (ex: 21:00)")
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("Termine une diffusion existante")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type de contenu")
            .setRequired(true)
            .addChoices(
              { name: "Film", value: "movie" },
              { name: "Série", value: "tv" },
            ),
        )
        .addStringOption((option) =>
          option
            .setName("title")
            .setDescription("Titre du film ou de la série")
            .setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const subcommand = interaction.options.getSubcommand();

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      if (subcommand === "start") {
        const type = interaction.options.getString("type", true) as WatchContentType;
        const title = interaction.options.getString("title", true);
        const date = interaction.options.getString("date", true);
        const time = interaction.options.getString("time", true);

        const result = await startWatchParty({
          interaction,
          type,
          title,
          date,
          time,
        });

        await interaction.editReply({
          content: result.message,
        });

        return;
      }

      if (subcommand === "end") {
        const type = interaction.options.getString("type", true) as WatchContentType;
        const title = interaction.options.getString("title", true);

        const result = await endWatchParty({
          interaction,
          type,
          title,
        });

        await interaction.editReply({
          content: result.message,
        });

        return;
      }

      await interaction.editReply({
        content: "❌ Sous-commande inconnue.",
      });
    } catch (error) {
      logger.error("[watch.command] error", {
        subcommand,
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        error,
      });

      await interaction.editReply({
        content: "❌ Une erreur est survenue pendant l’exécution de la commande /watch.",
      });
    }
  },
};