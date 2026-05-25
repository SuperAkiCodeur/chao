import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type GuildMember,
  type UserSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import {
  ROULETTE_CONSTANTS,
  ROULETTE_LAUNCH_PREFIX,
} from "../domain/roulette.constants.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Participant = {
  id: string;
  name: string;
};

// ── Sessions en mémoire ───────────────────────────────────────────────────────
// Clé : messageId de la réponse éphémère
// Valeur : participants + timestamp d'expiration

type Session = { participants: Participant[]; expiresAt: number };
const sessions = new Map<string, Session>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [key, s] of sessions) {
    if (s.expiresAt < now) sessions.delete(key);
  }
}

// ── Tirage ────────────────────────────────────────────────────────────────────

export function pickWinner(participants: Participant[]): Participant {
  return participants[Math.floor(Math.random() * participants.length)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Embeds ────────────────────────────────────────────────────────────────────

export function buildWinnerEmbed(
  winner: Participant,
  participants: Participant[],
): EmbedBuilder {
  const count = participants.length;

  const listValue = participants
    .map((p) => (p.id === winner.id ? `**${p.name} 🏆**` : p.name))
    .join(", ");

  const fieldValue =
    listValue.length > 1020 ? listValue.slice(0, 1017) + "…" : listValue;

  return new EmbedBuilder()
    .setColor(ROULETTE_CONSTANTS.EMBED_COLOR_WINNER)
    .setTitle("🎉  Et le gagnant est…")
    .setDescription(`\n🏆  <@${winner.id}>\n`)
    .addFields({
      name: `${count} participant${count > 1 ? "s" : ""}`,
      value: fieldValue,
    })
    .setFooter({ text: "Tiré au sort aléatoirement" });
}

// ── Logique commune de lancement ──────────────────────────────────────────────

async function runRoulette(
  participants: Participant[],
  interaction: ButtonInteraction,
): Promise<void> {
  // Ferme le menu éphémère de confirmation
  await interaction.update({ content: "🎰 Roulette lancée !", components: [] });

  const channel = interaction.channel;
  if (!channel?.isSendable()) {
    logger.warn("[roulette] salon non accessible", { channelId: interaction.channelId });
    await interaction
      .followUp({
        content: "❌ Impossible d'envoyer le résultat dans ce salon.",
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => null);
    return;
  }

  const winner = pickWinner(participants);
  try {
    await channel.send({ embeds: [buildWinnerEmbed(winner, participants)] });
  } catch (error) {
    logger.error("[roulette] impossible d'envoyer le winner embed", { error });
    return;
  }

  logger.info("[roulette] tirage effectué", {
    userId: interaction.user.id,
    guildId: interaction.guildId ?? null,
    participantCount: participants.length,
    winnerId: winner.id,
    winnerName: winner.name,
  });
}

// ── Handler UserSelectMenu — étape 1 : confirmation ───────────────────────────

export async function handleRouletteSelect(
  interaction: UserSelectMenuInteraction,
): Promise<void> {
  cleanExpiredSessions();

  // Résolution des participants (bots exclus silencieusement)
  const participants: Participant[] = [];
  const botsIgnored: string[] = [];

  for (const [id, user] of interaction.users) {
    if (user.bot) {
      botsIgnored.push(user.username);
      continue;
    }
    const memberOrPartial = interaction.members.get(id);
    const name =
      memberOrPartial && "displayName" in memberOrPartial
        ? (memberOrPartial as GuildMember).displayName
        : user.displayName ?? user.username;
    participants.push({ id, name });
  }

  if (participants.length < ROULETTE_CONSTANTS.MIN_PARTICIPANTS) {
    const botNote =
      botsIgnored.length > 0
        ? `\n*Les bots sont exclus automatiquement (${botsIgnored.join(", ")}).*`
        : "";
    await interaction.update({
      content: `❌ Il faut au moins ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS} membres réels.${botNote}`,
      components: [],
    });
    return;
  }

  // Stockage de la session (clé = messageId de la réponse éphémère)
  const messageId = interaction.message.id;
  sessions.set(messageId, {
    participants,
    expiresAt: Date.now() + ROULETTE_CONSTANTS.SESSION_TTL_MS,
  });

  // Message de confirmation avec la liste + bouton Lancer
  const nameList = participants.map((p) => p.name).join(", ");
  const botNote =
    botsIgnored.length > 0
      ? `\n*${botsIgnored.join(", ")} ignoré${botsIgnored.length > 1 ? "s" : ""} (bot).*`
      : "";

  const launchRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${ROULETTE_LAUNCH_PREFIX}${messageId}`)
      .setLabel("Lancer la roulette 🎰")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("roulette:cancel")
      .setLabel("Annuler")
      .setStyle(ButtonStyle.Secondary),
  );

  await interaction.update({
    content:
      `**${participants.length} participant${participants.length > 1 ? "s" : ""}** : ${nameList}${botNote}\n\nPrêt ?`,
    components: [launchRow],
  });
}

// ── Handler bouton — étape 2 : lancement ──────────────────────────────────────

export async function handleRouletteLaunch(
  interaction: ButtonInteraction,
): Promise<void> {
  const messageId = interaction.customId.slice(ROULETTE_LAUNCH_PREFIX.length);
  const session = sessions.get(messageId);
  sessions.delete(messageId); // consommé une seule fois

  if (!session || session.expiresAt < Date.now()) {
    await interaction.update({
      content: "❌ Session expirée. Relance `/roulette`.",
      components: [],
    });
    return;
  }

  await runRoulette(session.participants, interaction);
}

// ── Handler bouton Annuler ────────────────────────────────────────────────────

export async function handleRouletteCancel(
  interaction: ButtonInteraction,
): Promise<void> {
  await interaction.update({ content: "Roulette annulée.", components: [] });
}
