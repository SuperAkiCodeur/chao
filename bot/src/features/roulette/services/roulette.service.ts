import { EmbedBuilder } from "discord.js";
import { ROULETTE_CONSTANTS } from "../domain/roulette.constants.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Participant = {
  id: string;    // Discord user ID (pour la mention)
  name: string;  // Pseudo affiché dans le serveur
};

// ── Tirage ────────────────────────────────────────────────────────────────────

export function pickWinner(participants: Participant[]): Participant {
  return participants[Math.floor(Math.random() * participants.length)];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/**
 * Embed affiché pendant l'animation (≈2,5 s).
 * Simule une liste qui défile avec le centre mis en avant.
 */
export function buildSpinningEmbed(participants: Participant[]): EmbedBuilder {
  const visible = shuffle(participants).slice(0, ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS);
  const mid = Math.floor(visible.length / 2);

  const lines = visible.map(({ name }, i) => {
    if (i === mid)           return `┃  **${name}**`;
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

/**
 * Embed final : mentionne le gagnant (ping) et liste tous les participants.
 */
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
    // <@id> → mention avec ping
    .setDescription(`\n🏆  <@${winner.id}>\n`)
    .addFields({
      name: `${count} participant${count > 1 ? "s" : ""}`,
      value: fieldValue,
    })
    .setFooter({ text: "Tiré au sort aléatoirement" });
}
