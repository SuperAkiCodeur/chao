import {
  ChannelType,
  Client,
  EmbedBuilder,
  type Message,
  type TextChannel,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import { CEMANTIX_CONSTANTS } from "../domain/cemantix.constants.js";
import { CEMANTIX_WORDLIST } from "../domain/cemantix.wordlist.js";
import type { CemantixGame, CemantixTopGuess } from "../domain/cemantix.types.js";
import {
  deleteCemantixGame,
  findCemantixGame,
  getCemantixLeaderboard,
  getCemantixTopGuesses,
  markCemantixGameSolved,
  saveCemantixGame,
  updateCemantixAnnouncementMessageId,
  updateCemantixRankingMessageId,
  upsertCemantixTopGuess,
  type CemantixLeaderboardEntry,
} from "../repositories/cemantix.repository.js";
import {
  clearEmbeddingCache,
  computeSimilarityScore,
  preWarmSecretEmbedding,
  serializeError,
} from "./cemantixSimilarity.service.js";
import { insertLog } from "../../../core/db/logger.js";

// ---------------------------------------------------------------------------
// Helpers — date & word
// ---------------------------------------------------------------------------

export function getCurrentParisDayString(): string {
  const now = new Date();
  const [month, day, year] = new Intl.DateTimeFormat("en-US", {
    timeZone: CEMANTIX_CONSTANTS.TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("/");

  return `${year}-${month}-${day}`;
}

export function isPast10hInParis(): boolean {
  const parisNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: CEMANTIX_CONSTANTS.TIMEZONE }),
  );
  return parisNow.getHours() >= CEMANTIX_CONSTANTS.GAME_HOUR;
}

function getDailyWord(date: string): string {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return CEMANTIX_WORDLIST[Math.abs(hash) % CEMANTIX_WORDLIST.length];
}

// ---------------------------------------------------------------------------
// Helpers — word normalization
// ---------------------------------------------------------------------------

/** Lowercase + remove diacritical marks (so "château" = "chateau"). */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** True only if the guess is a plausible French word (letters + hyphens only). */
function isValidWordInput(raw: string): boolean {
  if (!raw || raw.length > CEMANTIX_CONSTANTS.MAX_WORD_LENGTH) {
    return false;
  }
  return /^[a-zàâäéèêëîïôöùûüÿçœæ'-]+$/i.test(raw) && !raw.includes(" ");
}

// ---------------------------------------------------------------------------
// Helpers — temperature label
// ---------------------------------------------------------------------------

export function getTemperatureLabel(score: number): string {
  for (const { minScore, label } of CEMANTIX_CONSTANTS.TEMPERATURES) {
    if (score >= minScore) {
      return label;
    }
  }
  return "🧊 Glacial";
}

// ---------------------------------------------------------------------------
// Helpers — Discord channel
// ---------------------------------------------------------------------------

async function fetchCemantixChannel(client: Client): Promise<TextChannel | null> {
  const cemantixChannelId = await getSetting(SETTING_KEYS.CEMANTIX_CHANNEL_ID);
  if (!cemantixChannelId) {
    logger.warn("[cemantix] cemantix_channel_id not configured in dashboard settings");
    return null;
  }

  const channel = await client.channels.fetch(cemantixChannelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  return channel as TextChannel;
}

async function unlockChannel(channel: TextChannel): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    { SendMessages: null }, // null = restore inherited default
    { reason: "Cémantix : nouvelle partie du jour" },
  );
}

async function lockChannel(channel: TextChannel): Promise<void> {
  await channel.permissionOverwrites.edit(
    channel.guild.roles.everyone,
    { SendMessages: false },
    { reason: "Cémantix : mot du jour trouvé" },
  );
}

// ---------------------------------------------------------------------------
// Helpers — embeds
// ---------------------------------------------------------------------------

function buildAnnouncementEmbed(date: string): EmbedBuilder {
  const [year, month, day] = date.split("-");
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${year}-${month}-${day}T12:00:00Z`));

  return new EmbedBuilder()
    .setColor(CEMANTIX_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🔤 Cémantix du ${formatted}`)
    .setDescription(
      "Un nouveau mot secret est à trouver !\n\n" +
      "**Comment jouer :**\n" +
      "• Envoie un mot dans ce salon pour tenter ta chance.\n" +
      "• Chaque mot reçoit un score de proximité de **0 à 100**.\n" +
      "• Plus ton score est élevé, plus tu t'approches du mot secret !\n" +
      "• Le premier joueur à trouver le **mot exact** gagne la partie.\n\n" +
      "Bonne chance à tous ! 🍀",
    );
}

function buildRankingEmbed(date: string, topGuesses: CemantixTopGuess[]): EmbedBuilder {
  const [year, month, day] = date.split("-");
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(new Date(`${year}-${month}-${day}T12:00:00Z`));

  const lines = topGuesses.map((g, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    const temp = getTemperatureLabel(g.score);
    return `${medal}  **${g.word}** — ${temp} (**${g.score}/100**)`;
  });

  return new EmbedBuilder()
    .setColor(CEMANTIX_CONSTANTS.DEFAULT_EMBED_COLOR)
    .setTitle(`🏆 Top ${CEMANTIX_CONSTANTS.TOP_GUESSES_COUNT} du ${formatted}`)
    .setDescription(lines.join("\n") || "Aucun mot dans le classement pour l'instant.");
}

function buildVictoryEmbed(
  winnerName: string,
  secretWord: string,
  topGuesses: CemantixTopGuess[],
): EmbedBuilder {
  const lines = topGuesses.slice(0, 5).map((g, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
    return `${medal}  **${g.word}** — ${g.score}/100`;
  });

  return new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎉 Mot du jour trouvé !")
    .setDescription(
      `**${winnerName}** a trouvé le mot secret : **${secretWord}** !\n\n` +
      "Bravo à lui ! Le salon est verrouillé jusqu'à demain à 10h. 🔒\n\n" +
      "**Top 5 du jour :**\n" +
      lines.join("\n"),
    );
}

function buildLeaderboardEmbed(entries: CemantixLeaderboardEntry[]): EmbedBuilder {
  const lines = entries.map((e, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
    const wins = e.wins === 1 ? "1 victoire" : `${e.wins} victoires`;
    return `${medal}  ${e.userName} — ${wins}`;
  });

  return new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("📊 Classement général Cémantix")
    .setDescription(
      lines.length > 0
        ? lines.join("\n")
        : "Aucune victoire enregistrée pour l'instant.",
    );
}

// ---------------------------------------------------------------------------
// Ranking message management
// ---------------------------------------------------------------------------

async function refreshRankingMessage(
  client: Client,
  game: CemantixGame,
  topGuesses: CemantixTopGuess[],
): Promise<void> {
  const channel = await fetchCemantixChannel(client);

  if (!channel) return;

  const embed = buildRankingEmbed(game.date, topGuesses);

  if (game.rankingMessageId) {
    const existing = await channel.messages
      .fetch(game.rankingMessageId)
      .catch(() => null);

    if (existing) {
      await existing.edit({ embeds: [embed] }).catch((error: unknown) => {
        logger.warn("[cemantix] Failed to edit ranking message", { error });
      });
      return;
    }
  }

  const sent = await channel.send({ embeds: [embed] });
  await updateCemantixRankingMessageId(game.date, sent.id);

  logger.info("[cemantix] Ranking message created", { date: game.date, messageId: sent.id });
}

// ---------------------------------------------------------------------------
// Start a new daily game
// ---------------------------------------------------------------------------

export async function startDailyCemantixGame(client: Client): Promise<void> {
  const date = getCurrentParisDayString();

  const existing = await findCemantixGame(date);

  if (existing) {
    logger.info("[cemantix] Game already exists for today, skipping start", { date });
    return;
  }

  clearEmbeddingCache();

  const secretWord = getDailyWord(date);

  const game: CemantixGame = {
    date,
    secretWord,
    isSolved: false,
    winnerId: null,
    winnerName: null,
    announcementMessageId: null,
    rankingMessageId: null,
    startedAt: new Date().toISOString(),
    solvedAt: null,
  };

  await saveCemantixGame(game);

  const channel = await fetchCemantixChannel(client);

  if (!channel) {
    logger.error("[cemantix] Channel not found or not a text channel (check dashboard settings)");
    return;
  }

  // Unlock channel for the new game
  await unlockChannel(channel).catch((error: unknown) => {
    logger.warn("[cemantix] Failed to unlock channel", { error });
  });

  // Pre-warm the secret word embedding (avoids cold-start for first player)
  void preWarmSecretEmbedding(secretWord);

  // Send announcement
  const embed = buildAnnouncementEmbed(date);
  const announcement = await channel.send({ embeds: [embed] });
  await updateCemantixAnnouncementMessageId(date, announcement.id);

  logger.info("[cemantix] Daily game started", {
    date,
    channelId: channel.id,
    announcementMessageId: announcement.id,
  });

  void insertLog({
    type: "cemantix",
    action: "new_game",
    description: `🎮 Nouvelle partie démarrée — mot secret choisi`,
    metadata: { date },
  });
}

// ---------------------------------------------------------------------------
// Restore state on bot restart
// ---------------------------------------------------------------------------

export async function restoreCemantixState(client: Client): Promise<void> {
  const date = getCurrentParisDayString();
  const game = await findCemantixGame(date);

  if (!game) {
    if (isPast10hInParis()) {
      logger.info("[cemantix] No game found after 10h, starting one now", { date });
      await startDailyCemantixGame(client);
    }
    return;
  }

  if (game.isSolved) {
    logger.info("[cemantix] Today's game already solved, waiting for tomorrow", { date });
    return;
  }

  // Active game — re-warm the embedding cache
  void preWarmSecretEmbedding(game.secretWord);

  logger.info("[cemantix] Active game restored", { date });
}

// ---------------------------------------------------------------------------
// Handle a player's guess (messageCreate)
// ---------------------------------------------------------------------------

export async function handleCemantixGuess(message: Message<true>): Promise<void> {
  const raw = message.content.trim().toLowerCase();

  if (!isValidWordInput(raw)) {
    return;
  }

  const date = getCurrentParisDayString();
  const game = await findCemantixGame(date);

  if (!game || game.isSolved) {
    return;
  }

  // ── Win detection ─────────────────────────────────────────────────────────
  if (normalizeWord(raw) === normalizeWord(game.secretWord)) {
    await handleWin(message, game);
    return;
  }

  // ── Similarity score ──────────────────────────────────────────────────────
  let score: number;

  try {
    score = await computeSimilarityScore(raw, game.secretWord);
  } catch (error) {
    logger.error("[cemantix] Failed to compute similarity", {
      word: raw,
      error: serializeError(error),
    });
    await message
      .reply("❌ Service temporairement indisponible, réessaie dans quelques secondes.")
      .catch(() => null);
    return;
  }

  const temp = getTemperatureLabel(score);

  // ── Update top-10 ─────────────────────────────────────────────────────────
  const { topGuesses, enteredTop } = await upsertCemantixTopGuess({
    gameDate: date,
    word: raw,
    userId: message.author.id,
    userName: message.author.displayName ?? message.author.username,
    score,
  });

  // ── Reply to the player ───────────────────────────────────────────────────
  const rankLine = enteredTop ? ` — **Top ${CEMANTIX_CONSTANTS.TOP_GUESSES_COUNT}** ! 🎯` : "";

  await message
    .reply(`${temp} — **${score}/100** pour « ${raw} »${rankLine}`)
    .catch(() => null);

  // ── Update ranking message if top changed ─────────────────────────────────
  if (enteredTop) {
    await refreshRankingMessage(message.client, game, topGuesses);
  }
}

// ---------------------------------------------------------------------------
// Win handler
// ---------------------------------------------------------------------------

async function handleWin(message: Message<true>, game: CemantixGame): Promise<void> {
  const winnerName = message.member?.displayName ?? message.author.username;
  const solvedAt = new Date().toISOString();

  await markCemantixGameSolved({
    date: game.date,
    winnerId: message.author.id,
    winnerName,
    solvedAt,
  });

  const topGuesses = await getCemantixTopGuesses(game.date);
  const victoryEmbed = buildVictoryEmbed(winnerName, game.secretWord, topGuesses);

  await message.reply({ embeds: [victoryEmbed] }).catch(() => null);

  // Lock channel until tomorrow at 10h
  const channel = await fetchCemantixChannel(message.client);

  if (channel) {
    await lockChannel(channel).catch((error: unknown) => {
      logger.warn("[cemantix] Failed to lock channel after win", { error });
    });

    // Post all-time leaderboard
    const leaderboard = await getCemantixLeaderboard();
    const leaderboardEmbed = buildLeaderboardEmbed(leaderboard);
    await channel.send({ embeds: [leaderboardEmbed] }).catch((error: unknown) => {
      logger.warn("[cemantix] Failed to post leaderboard", { error });
    });
  }

  logger.info("[cemantix] Game won", {
    date: game.date,
    winnerId: message.author.id,
    winnerName,
    secretWord: game.secretWord,
  });

  void insertLog({
    type: "cemantix",
    action: "solved",
    description: `🏆 ${winnerName} a trouvé le mot secret « ${game.secretWord} »`,
    userId: message.author.id,
    userName: winnerName,
    metadata: { date: game.date, secretWord: game.secretWord },
  });
}
