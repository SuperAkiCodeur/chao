import { EmbedBuilder } from "discord.js";
import { ROULETTE_CONSTANTS } from "../domain/roulette.constants.js";

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Découpe la chaîne saisie par l'utilisateur en liste de noms.
 * Séparateurs acceptés : virgule, point-virgule.
 * Les doublons et les noms vides sont filtrés.
 */
export function parseParticipants(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of input.split(/[,;]+/)) {
    const name = raw.trim().slice(0, 50); // cap à 50 chars par nom
    if (name.length > 0 && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      result.push(name);
    }
  }

  return result.slice(0, ROULETTE_CONSTANTS.MAX_PARTICIPANTS);
}

// ── Tirage ────────────────────────────────────────────────────────────────────

export function pickWinner(participants: string[]): string {
  return participants[Math.floor(Math.random() * participants.length)];
}

// ── Embeds ────────────────────────────────────────────────────────────────────

/** Mélange un tableau (Fisher-Yates) sans modifier l'original. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Embed affiché immédiatement après le defer.
 * Montre une liste mélangée avec une "fenêtre" animée au centre.
 */
export function buildSpinningEmbed(participants: string[]): EmbedBuilder {
  const visible = shuffle(participants).slice(0, ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS);
  const mid = Math.floor(visible.length / 2);

  const lines = visible.map((name, i) => {
    if (i === mid) return `┃  **${name}**`;
    const opacity = Math.abs(i - mid);
    return opacity === 1 ? `╎  ${name}` : `   ${name}`;
  });

  const more = participants.length > ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS
    ? `\n*… et ${participants.length - ROULETTE_CONSTANTS.SPIN_VISIBLE_ROWS} autre(s)*`
    : "";

  return new EmbedBuilder()
    .setColor(ROULETTE_CONSTANTS.EMBED_COLOR_SPINNING)
    .setTitle("🎰  La roulette tourne…")
    .setDescription(lines.join("\n") + more)
    .setFooter({ text: `${participants.length} participant${participants.length > 1 ? "s" : ""} en lice` });
}

/**
 * Embed final avec le gagnant mis en avant.
 */
export function buildWinnerEmbed(winner: string, participants: string[]): EmbedBuilder {
  const count = participants.length;

  // Liste des participants : gagnant en gras + trophée, autres en texte simple
  const listValue = participants
    .map((p) => (p === winner ? `**${p} 🏆**` : p))
    .join(", ");

  // Tronqué si trop long pour un champ Discord (max 1024 chars)
  const fieldValue = listValue.length > 1020
    ? listValue.slice(0, 1017) + "…"
    : listValue;

  return new EmbedBuilder()
    .setColor(ROULETTE_CONSTANTS.EMBED_COLOR_WINNER)
    .setTitle("🎉  Et le gagnant est…")
    .setDescription(`\n🏆  **${winner}**\n`)
    .addFields({
      name: `${count} participant${count > 1 ? "s" : ""}`,
      value: fieldValue,
    })
    .setFooter({ text: "Tiré au sort aléatoirement" });
}
