import {
  EmbedBuilder,
  Message,
  MessageFlags,
  type GuildMember,
  type UserSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { ROULETTE_CONSTANTS } from "../domain/roulette.constants.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Participant = {
  id: string;   // Discord user ID — utilisé pour le ping du gagnant
  name: string; // Pseudo affiché (nickname serveur en priorité)
};

// ── Tirage ────────────────────────────────────────────────────────────────────

export function pickWinner(participants: Participant[]): Participant {
  return participants[Math.floor(Math.random() * participants.length)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Embeds ────────────────────────────────────────────────────────────────────

export function buildSpinningEmbed(participants: Participant[]): EmbedBuilder {
  const visible = shuffle(participants).slice(0, ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS);
  const mid = Math.floor(visible.length / 2);

  const lines = visible.map(({ name }, i) => {
    if (i === mid)               return `┃  **${name}**`;
    if (Math.abs(i - mid) === 1) return `╎  ${name}`;
    return `   ${name}`;
  });

  const extra = participants.length > ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS
    ? `\n*… et ${participants.length - ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS} autre(s)*`
    : "";

  return new EmbedBuilder()
    .setColor(ROULETTE_CONSTANTS.EMBED_COLOR_SPINNING)
    .setTitle("🎰  La roulette tourne…")
    .setDescription(lines.join("\n") + extra)
    .setFooter({ text: `${participants.length} participant${participants.length > 1 ? "s" : ""} en lice` });
}

export function buildWinnerEmbed(winner: Participant, participants: Participant[]): EmbedBuilder {
  const count = participants.length;

  const listValue = participants
    .map((p) => (p.id === winner.id ? `**${p.name} 🏆**` : p.name))
    .join(", ");

  const fieldValue = listValue.length > 1020
    ? listValue.slice(0, 1017) + "…"
    : listValue;

  return new EmbedBuilder()
    .setColor(ROULETTE_CONSTANTS.EMBED_COLOR_WINNER)
    .setTitle("🎉  Et le gagnant est…")
    .setDescription(`\n🏆  <@${winner.id}>\n`)
    .addFields({ name: `${count} participant${count > 1 ? "s" : ""}`, value: fieldValue })
    .setFooter({ text: "Tiré au sort aléatoirement" });
}

// ── Handler UserSelectMenu ────────────────────────────────────────────────────

export async function handleRouletteSelect(
  interaction: UserSelectMenuInteraction,
): Promise<void> {
  // Collecter les participants depuis les users résolus par Discord
  const participants: Participant[] = [];

  for (const [id, user] of interaction.users) {
    if (user.bot) continue;
    // Préférer le nickname serveur si disponible
    const memberOrPartial = interaction.members.get(id);
    const name = memberOrPartial && "displayName" in memberOrPartial
      ? (memberOrPartial as GuildMember).displayName
      : user.displayName ?? user.username;
    participants.push({ id, name });
  }

  if (participants.length < ROULETTE_CONSTANTS.MIN_PARTICIPANTS) {
    await interaction.update({
      content: `❌ Sélectionne au moins ${ROULETTE_CONSTANTS.MIN_PARTICIPANTS} membres (bots exclus).`,
      components: [],
    });
    return;
  }

  // Ferme le menu éphémère
  await interaction.update({
    content: "🎰 Roulette lancée !",
    components: [],
  });

  // Envoie le résultat en public dans le salon
  const channel = interaction.channel;
  if (!channel || !channel.isSendable()) {
    logger.warn("[roulette] salon non accessible", { channelId: interaction.channelId });
    await interaction.followUp({
      content: "❌ Impossible d'envoyer le résultat dans ce salon.",
      flags: MessageFlags.Ephemeral,
    }).catch(() => null);
    return;
  }

  let spinMsg: Message;
  try {
    spinMsg = await channel.send({ embeds: [buildSpinningEmbed(participants)] });
  } catch (error) {
    logger.error("[roulette] impossible d'envoyer le spinning embed", { error });
    return;
  }

  await sleep(ROULETTE_CONSTANTS.SPIN_DURATION_MS);

  const winner = pickWinner(participants);

  try {
    await spinMsg.edit({ embeds: [buildWinnerEmbed(winner, participants)] });
  } catch (error) {
    logger.error("[roulette] impossible d'éditer le winner embed", { error });
  }

  logger.info("[roulette] tirage effectué", {
    userId: interaction.user.id,
    guildId: interaction.guildId ?? null,
    participantCount: participants.length,
    winnerId: winner.id,
    winnerName: winner.name,
  });
}
