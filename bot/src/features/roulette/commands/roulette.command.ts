import {
  MessageFlags,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { ROULETTE_CONSTANTS } from "../domain/roulette.constants.js";
import type { Participant } from "../services/roulette.service.js";
import {
  buildSpinningEmbed,
  buildWinnerEmbed,
  pickWinner,
} from "../services/roulette.service.js";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Extrait tous les <@id> ou <@!id> d'une chaîne Discord
const MENTION_RE = /<@!?(\d+)>/g;

export const rouletteCommand = {
  data: new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("Tire au sort un membre parmi une liste de mentions Discord")
    .addStringOption((opt) =>
      opt
        .setName("participants")
        .setDescription(
          `Mentionnez les membres avec @ — ex : @Alice @Bob @Charlie (max ${ROULETTE_CONSTANTS.MAX_PARTICIPANTS})`,
        )
        .setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const input = interaction.options.getString("participants", true);

    // ── Extraction des mentions ────────────────────────────────────────────

    const seen = new Set<string>();
    const participants: Participant[] = [];
    let match: RegExpExecArray | null;

    MENTION_RE.lastIndex = 0; // reset au cas où la regex est réutilisée
    while ((match = MENTION_RE.exec(input)) !== null) {
      const userId = match[1];
      if (seen.has(userId)) continue; // doublon
      seen.add(userId);

      // Discord injecte les données résolues dans l'interaction pour chaque mention
      const user = interaction.options.resolved?.users?.get(userId);
      if (!user || user.bot) continue;

      const member = interaction.options.resolved?.members?.get(userId) as GuildMember | null;
      const name = member?.displayName ?? user.displayName ?? user.username;

      participants.push({ id: userId, name });

      if (participants.length >= ROULETTE_CONSTANTS.MAX_PARTICIPANTS) break;
    }

    // ── Validation ────────────────────────────────────────────────────────

    if (participants.length < ROULETTE_CONSTANTS.MIN_PARTICIPANTS) {
      await interaction.reply({
        content: `❌ Il faut mentionner au moins ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS} membres distincts avec @.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Tirage ────────────────────────────────────────────────────────────

    await interaction.deferReply();

    try {
      await interaction.editReply({ embeds: [buildSpinningEmbed(participants)] });

      await sleep(ROULETTE_CONSTANTS.SPIN_DURATION_MS);

      const winner = pickWinner(participants);
      await interaction.editReply({ embeds: [buildWinnerEmbed(winner, participants)] });

      logger.info("[roulette] tirage effectué", {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? null,
        participantCount: participants.length,
        winnerId: winner.id,
        winnerName: winner.name,
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
