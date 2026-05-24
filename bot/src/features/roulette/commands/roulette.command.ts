import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { ROULETTE_CONSTANTS } from "../domain/roulette.constants.js";
import {
  buildSpinningEmbed,
  buildWinnerEmbed,
  parseParticipants,
  pickWinner,
} from "../services/roulette.service.js";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const rouletteCommand = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Tire au sort un participant parmi une liste de noms")
    .addStringOption((opt) =>
      opt
        .setName("participants")
        .setDescription(
          `Noms séparés par des virgules — ex : Alice, Bob, Charlie (max ${ROULETTE_CONSTANTS.MAX_PARTICIPANTS})`,
        )
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString("participants", true);
    const participants = parseParticipants(input);

    // ── Validation ────────────────────────────────────────────────────────────

    if (participants.length < ROULETTE_CONSTANTS.MIN_PARTICIPANTS) {
      await interaction.reply({
        content: `❌ Il faut au minimum ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS} participants distincts.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Tirage ────────────────────────────────────────────────────────────────

    // Réponse publique : tout le monde voit le résultat dans le salon
    await interaction.deferReply();

    try {
      // Phase 1 — animation "spinning"
      await interaction.editReply({ embeds: [buildSpinningEmbed(participants)] });

      await sleep(ROULETTE_CONSTANTS.SPIN_DURATION_MS);

      // Phase 2 — révélation du gagnant
      const winner = pickWinner(participants);
      await interaction.editReply({ embeds: [buildWinnerEmbed(winner, participants)] });

      logger.info("[roulette] tirage effectué", {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        participantCount: participants.length,
        winner,
      });
    } catch (error) {
      logger.error("[roulette.command] erreur", {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        error,
      });

      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Une erreur est survenue pendant le tirage. Réessaie.",
        });
      }
    }
  },
};
