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

// ---------------------------------------------------------------------------
// Slash command builder
// ---------------------------------------------------------------------------

const builder = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("Tire au sort un membre parmi une liste de mentions Discord");

// user1 est obligatoire, user2…user10 sont optionnels
builder.addUserOption((opt) =>
  opt.setName("user1").setDescription("Participant 1").setRequired(true),
);
for (let i = 2; i <= ROULETTE_CONSTANTS.MAX_PARTICIPANTS; i++) {
  builder.addUserOption((opt) =>
    opt.setName(`user${i}`).setDescription(`Participant ${i}`).setRequired(false),
  );
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const rouletteCommand = {
  data: builder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // ── Collecte des participants ───────────────────────────────────────────

    const seen = new Set<string>();
    const participants: Participant[] = [];

    for (let i = 1; i <= ROULETTE_CONSTANTS.MAX_PARTICIPANTS; i++) {
      const user = interaction.options.getUser(`user${i}`, false);
      if (!user) continue;                   // option non renseignée
      if (user.bot) continue;                // bots exclus silencieusement
      if (seen.has(user.id)) continue;       // doublon ignoré
      seen.add(user.id);

      // Préférer le pseudo serveur (nickname) si disponible
      const member = interaction.options.getMember(`user${i}`) as GuildMember | null;
      const name = member?.displayName ?? user.displayName ?? user.username;

      participants.push({ id: user.id, name });
    }

    // ── Validation ─────────────────────────────────────────────────────────

    if (participants.length < ROULETTE_CONSTANTS.MIN_PARTICIPANTS) {
      await interaction.reply({
        content: `❌ Il faut mentionner au moins ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS} membres distincts.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── Tirage ─────────────────────────────────────────────────────────────

    // Réponse publique : tout le monde voit l'animation + le résultat
    await interaction.deferReply();

    try {
      // Phase 1 — animation spinning
      await interaction.editReply({ embeds: [buildSpinningEmbed(participants)] });

      await sleep(ROULETTE_CONSTANTS.SPIN_DURATION_MS);

      // Phase 2 — révélation du gagnant (avec ping)
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
