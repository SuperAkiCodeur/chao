import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { env } from "../../../core/config/env.js";
import { logger } from "../../../core/app/logger.js";
import type { ValorantStatsType } from "../domain/valorant.types.js";
import {
  buildLeaderboardEmbed,
  buildResultsEmbed,
  buildStatsEmbed,
  linkValorantAccount,
} from "../services/valorant.service.js";

export const valorantCommand = {
  data: new SlashCommandBuilder()
    .setName("valorant")
    .setDescription("Commandes Valorant du serveur")
    .addSubcommand((sub) =>
      sub
        .setName("link")
        .setDescription("Lie ton compte Riot à Discord")
        .addStringOption((opt) =>
          opt
            .setName("riot_id")
            .setDescription("Ton Riot ID (ex: Player#EUW)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("results")
        .setDescription("Affiche les derniers résultats d'un joueur")
        .addUserOption((opt) =>
          opt
            .setName("player")
            .setDescription("Joueur à consulter (toi par défaut)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leaderboard")
        .setDescription("Classement Valorant du serveur"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Statistiques détaillées d'un joueur")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Type de statistiques")
            .setRequired(true)
            .addChoices(
              { name: "Global", value: "global" },
              { name: "Par agent", value: "agent" },
              { name: "Par map", value: "map" },
              { name: "Temps de jeu", value: "playtime" },
            ),
        )
        .addUserOption((opt) =>
          opt
            .setName("player")
            .setDescription("Joueur à consulter (toi par défaut)")
            .setRequired(false),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "❌ Cette commande doit être utilisée dans un serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (env.VALORANT_CHANNEL_ID && interaction.channelId !== env.VALORANT_CHANNEL_ID) {
      await interaction.reply({
        content: `❌ Cette commande est réservée au salon <#${env.VALORANT_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand(true);

    // link répond en éphémère, les autres en public
    const isPublic = subcommand !== "link";

    await interaction.deferReply({
      flags: isPublic ? undefined : MessageFlags.Ephemeral,
    });

    try {
      if (subcommand === "link") {
        const riotId = interaction.options.getString("riot_id", true);

        const result = await linkValorantAccount({
          discordUserId: interaction.user.id,
          guildId: interaction.guildId,
          riotId,
        });

        await interaction.editReply({ content: result.message });
        return;
      }

      if (subcommand === "results") {
        const targetUser = interaction.options.getUser("player");
        const targetId = targetUser?.id ?? interaction.user.id;

        const result = await buildResultsEmbed({
          targetDiscordUserId: targetId,
          guildId: interaction.guildId,
        });

        if ("error" in result) {
          await interaction.editReply({ content: result.error });
          return;
        }

        await interaction.editReply({ embeds: [result.embed] });
        return;
      }

      if (subcommand === "leaderboard") {
        const result = await buildLeaderboardEmbed(interaction.guildId);

        if ("error" in result) {
          await interaction.editReply({ content: result.error });
          return;
        }

        await interaction.editReply({ embeds: [result.embed] });
        return;
      }

      if (subcommand === "stats") {
        const type = interaction.options.getString("type", true) as ValorantStatsType;
        const targetUser = interaction.options.getUser("player");
        const targetId = targetUser?.id ?? interaction.user.id;

        const result = await buildStatsEmbed({
          targetDiscordUserId: targetId,
          guildId: interaction.guildId,
          type,
        });

        if ("error" in result) {
          await interaction.editReply({ content: result.error });
          return;
        }

        await interaction.editReply({ embeds: [result.embed] });
        return;
      }

      await interaction.editReply({ content: "❌ Sous-commande inconnue." });
    } catch (error) {
      logger.error("[valorant.command] error", {
        subcommand,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        error,
      });

      await interaction.editReply({
        content: "❌ Une erreur est survenue. Réessaie plus tard.",
      });
    }
  },
};
