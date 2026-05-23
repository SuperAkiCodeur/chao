import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import { VALORANT_CONSTANTS } from "../domain/valorant.constants.js";
import type { ValorantStatsType } from "../domain/valorant.types.js";
import {
  buildLeaderboardEmbed,
  buildResultsEmbed,
  buildStatsEmbed,
  linkValorantAccount,
} from "../services/valorant.service.js";

// ---------------------------------------------------------------------------
// Help embed
// ---------------------------------------------------------------------------

function buildHelpEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(VALORANT_CONSTANTS.EMBED_COLOR)
    .setTitle("🎮 Commandes Valorant")
    .setDescription("Toutes les commandes disponibles et comment les utiliser.")
    .addFields(
      {
        name: "`/valorant link riot_id: <RiotID#Tag>`",
        value:
          "Lie ton compte Riot à ton profil Discord.\n" +
          "→ Nécessaire avant d'utiliser les autres commandes.\n" +
          "Exemple : `/valorant link riot_id: Player#EUW`",
      },
      {
        name: "`/valorant results [player]`",
        value:
          "Affiche les derniers matchs d'un joueur avec K/D, résultats et rang.\n" +
          "→ Sans option : tes propres résultats.\n" +
          "Exemple : `/valorant results player: @Akash`",
      },
      {
        name: "`/valorant stats type: <type> [player]`",
        value:
          "Statistiques détaillées selon le type choisi :\n" +
          "• **Global** — K/D, winrate, headshot%, etc.\n" +
          "• **Par agent** — stats par personnage joué\n" +
          "• **Par map** — winrate par carte\n" +
          "• **Temps de jeu** — heures passées en jeu\n" +
          "→ Sans option player : tes propres stats.\n" +
          "Exemple : `/valorant stats type: Par agent player: @Akash`",
      },
      {
        name: "`/valorant leaderboard`",
        value:
          "Classement des membres du serveur par rang Valorant.\n" +
          "→ Seuls les joueurs ayant fait `/valorant link` apparaissent.",
      },
      {
        name: "`/valorant help`",
        value: "Affiche ce message d'aide.",
      },
    )
    .setFooter({ text: "Toutes les données proviennent de tracker.gg via Henrik API" });
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

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
    .addSubcommand((sub) =>
      sub
        .setName("help")
        .setDescription("Affiche toutes les commandes Valorant disponibles"),
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

    const subcommand = interaction.options.getSubcommand(true);

    // help répond partout, sans restriction de salon
    if (subcommand === "help") {
      await interaction.reply({ embeds: [buildHelpEmbed()], flags: MessageFlags.Ephemeral });
      return;
    }

    const valorantChannelId = await getSetting(SETTING_KEYS.VALORANT_CHANNEL_ID);
    if (valorantChannelId && interaction.channelId !== valorantChannelId) {
      await interaction.reply({
        content: `❌ Cette commande est réservée au salon <#${valorantChannelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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
