import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { AppCommand } from "../../../core/discord/commandRegistry.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";
import {
  endCemantixGame,
  getCurrentParisDayString,
  getTemperatureLabel,
  startDailyCemantixGame,
} from "../services/cemantix.service.js";
import {
  findCemantixGame,
  getCemantixTopGuesses,
} from "../repositories/cemantix.repository.js";

export const cemantixCommand: AppCommand = {
  data: new SlashCommandBuilder()
    .setName("cemantix")
    .setDescription("Gestion du Cémantix quotidien (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Lance la partie du jour maintenant (force si déjà démarrée)"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Affiche l'état de la partie en cours"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription("Termine la partie en cours et déverrouille le salon"),
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      await handleStart(interaction);
    } else if (sub === "status") {
      await handleStatus(interaction);
    } else if (sub === "end") {
      await handleEnd(interaction);
    }
  },
};

// ---------------------------------------------------------------------------
// /cemantix start
// ---------------------------------------------------------------------------

async function handleStart(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const date = getCurrentParisDayString();
  const existing = await findCemantixGame(date);
  const forced = Boolean(existing);

  await startDailyCemantixGame(interaction.client, true);

  const game = await findCemantixGame(date);

  if (!game) {
    await interaction.editReply("❌ Échec du lancement de la partie.");
    return;
  }

  await interaction.editReply(
    forced
      ? `🔄 Partie relancée ! Mot secret : **${game.secretWord}**`
      : `✅ Partie lancée ! Mot secret : **${game.secretWord}**`,
  );
}

// ---------------------------------------------------------------------------
// /cemantix status
// ---------------------------------------------------------------------------

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const date = getCurrentParisDayString();
  const game = await findCemantixGame(date);

  if (!game) {
    await interaction.editReply("ℹ️ Aucune partie en cours aujourd'hui.");
    return;
  }

  const topGuesses = await getCemantixTopGuesses(date);

  const statusIcon = game.isSolved ? "🔒 Terminée" : "🟢 Active";
  const winnerLine = game.isSolved && game.winnerName
    ? `\n**Gagnant :** ${game.winnerName}`
    : "";

  const topLines = topGuesses
    .slice(0, 5)
    .map((g, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
      return `${medal} **${g.word}** — ${getTemperatureLabel(g.score)} (${g.score}/100)`;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setColor(CEMANTIX_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🔤 Cémantix — ${date}`)
    .addFields(
      { name: "Statut", value: statusIcon, inline: true },
      { name: "Mot secret", value: `||${game.secretWord}||`, inline: true },
      {
        name: `Top ${Math.min(5, topGuesses.length)} mot${topGuesses.length > 1 ? "s" : ""}`,
        value: topLines || "Aucun mot dans le classement.",
      },
    )
    .setFooter({ text: `Démarré à ${new Date(game.startedAt).toLocaleTimeString("fr-FR")}` });

  if (winnerLine) {
    embed.setDescription(winnerLine);
  }

  await interaction.editReply({ embeds: [embed] });
}

// ---------------------------------------------------------------------------
// /cemantix end
// ---------------------------------------------------------------------------

async function handleEnd(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ended = await endCemantixGame(interaction.client);

  if (!ended) {
    await interaction.editReply("ℹ️ Aucune partie active à terminer.");
    return;
  }

  await interaction.editReply("✅ Partie terminée. Le salon est déverrouillé.");
}
