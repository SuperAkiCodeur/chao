import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";
import {
  VALORANT_CONSTANTS,
  VALORANT_MENU_ID,
  VALORANT_STATS_SELECT_ID,
  VALORANT_MODAL_LINK_ID,
  VALORANT_INPUT_RIOT_ID,
  VALORANT_BACK_BTN_ID,
} from "../domain/valorant.constants.js";
import type {
  HenrikMatch,
  HenrikMatchPlayer,
  ValorantLinkedAccount,
  ValorantStatsType,
} from "../domain/valorant.types.js";
import {
  findAllLinkedAccountsInGuild,
  findLinkedAccount,
  saveLinkedAccount,
} from "../repositories/valorant.repository.js";
import {
  ValorantApiError,
  fetchRecentMatches,
  fetchValorantAccount,
  fetchValorantMmr,
} from "./valorantApi.service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RIOT_ID_REGEX = /^.{1,16}#[a-zA-Z0-9]{3,5}$/;

function parseRiotId(riotId: string): { name: string; tag: string } | null {
  const trimmed = riotId.trim();

  if (!RIOT_ID_REGEX.test(trimmed)) {
    return null;
  }

  const hashIndex = trimmed.lastIndexOf("#");

  return {
    name: trimmed.slice(0, hashIndex),
    tag: trimmed.slice(hashIndex + 1),
  };
}

function getPlayerInMatch(
  match: HenrikMatch,
  puuid: string,
): HenrikMatchPlayer | null {
  return match.players.all_players.find((p) => p.puuid === puuid) ?? null;
}

function didPlayerWin(match: HenrikMatch, player: HenrikMatchPlayer): boolean {
  const team = player.team.toLowerCase() as "red" | "blue";
  return match.teams[team]?.has_won ?? false;
}

function formatKda(kills: number, deaths: number, assists: number): string {
  return `${kills}/${deaths}/${assists}`;
}

function formatPlaytime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function formatMmrChange(change: number): string {
  return change >= 0 ? `+${change}` : `${change}`;
}

// ---------------------------------------------------------------------------
// link
// ---------------------------------------------------------------------------

export async function linkValorantAccount(params: {
  discordUserId: string;
  guildId: string;
  riotId: string;
}): Promise<{ success: boolean; message: string }> {
  const parsed = parseRiotId(params.riotId);

  if (!parsed) {
    return {
      success: false,
      message: "❌ Format invalide. Utilise `Pseudo#TAG` (ex: `Player#EUW`).",
    };
  }

  let account;

  try {
    account = await fetchValorantAccount(parsed.name, parsed.tag);
  } catch (error) {
    if (error instanceof ValorantApiError) {
      if (error.isNotFound) {
        return {
          success: false,
          message: `❌ Compte \`${params.riotId}\` introuvable. Vérifie le pseudo et le tag.`,
        };
      }

      if (error.isRateLimited) {
        return {
          success: false,
          message: "❌ Limite de requêtes atteinte. Réessaie dans quelques secondes.",
        };
      }
    }

    logger.error("Failed to fetch Valorant account for link", {
      riotId: params.riotId,
      error,
    });

    return {
      success: false,
      message: "❌ Une erreur est survenue lors de la vérification du compte.",
    };
  }

  await saveLinkedAccount({
    discordUserId: params.discordUserId,
    guildId: params.guildId,
    riotId: `${account.name}#${account.tag}`,
    puuid: account.puuid,
    region: account.region ?? VALORANT_CONSTANTS.DEFAULT_REGION,
    linkedAt: new Date().toISOString(),
  });

  logger.info("Valorant account linked", {
    discordUserId: params.discordUserId,
    guildId: params.guildId,
    riotId: `${account.name}#${account.tag}`,
    region: account.region,
  });

  return {
    success: true,
    message: `✅ Compte \`${account.name}#${account.tag}\` lié avec succès (région : **${account.region.toUpperCase()}**, niveau **${account.account_level}**).`,
  };
}

// ---------------------------------------------------------------------------
// results
// ---------------------------------------------------------------------------

export async function buildResultsEmbed(params: {
  targetDiscordUserId: string;
  guildId: string;
}): Promise<{ embed: EmbedBuilder } | { error: string }> {
  const linked = await findLinkedAccount(params.targetDiscordUserId, params.guildId);

  if (!linked) {
    return {
      error: "❌ Ce joueur n'a pas lié de compte Valorant. Utilise `/valorant link` d'abord.",
    };
  }

  const parsed = parseRiotId(linked.riotId);

  if (!parsed || !linked.region) {
    return { error: "❌ Les données de ce compte sont corrompues. Relie le compte avec `/valorant link`." };
  }

  let matches: HenrikMatch[];

  try {
    matches = await fetchRecentMatches(
      linked.region,
      parsed.name,
      parsed.tag,
      VALORANT_CONSTANTS.RESULTS_SIZE,
    );
  } catch (error) {
    if (error instanceof ValorantApiError && error.isNotFound) {
      return { error: "❌ Aucun match trouvé pour ce joueur." };
    }

    logger.error("Failed to fetch Valorant matches for results", {
      riotId: linked.riotId,
      error,
    });

    return { error: "❌ Impossible de récupérer les matchs. Réessaie plus tard." };
  }

  const embed = new EmbedBuilder()
    .setColor(VALORANT_CONSTANTS.EMBED_COLOR)
    .setTitle(`🎯 Derniers résultats de ${linked.riotId}`)
    .setFooter({ text: `Région : ${linked.region.toUpperCase()}` });

  if (!matches.length) {
    embed.setDescription("Aucun match récent trouvé.");
    return { embed };
  }

  const fields = matches.map((match) => {
    const player = linked.puuid ? getPlayerInMatch(match, linked.puuid) : null;
    const won = player ? didPlayerWin(match, player) : null;
    const result = won === null ? "❓" : won ? "✅" : "❌";
    const kda = player
      ? formatKda(player.stats.kills, player.stats.deaths, player.stats.assists)
      : "—";
    const agent = player?.character ?? "—";
    const rounds = (() => {
      const team = player?.team.toLowerCase() as "red" | "blue" | undefined;
      if (!team) return "";
      const ours = match.teams[team];
      const theirs = team === "red" ? match.teams.blue : match.teams.red;
      return `${ours.rounds_won}-${theirs.rounds_won}`;
    })();
    const timestamp = match.metadata.game_start;

    return {
      name: `${result} ${match.metadata.map} · ${match.metadata.mode}`,
      value: [
        `**Agent :** ${agent} · **K/D/A :** ${kda} · **Rounds :** ${rounds || "—"}`,
        `<t:${timestamp}:R>`,
      ].join("\n"),
      inline: false,
    };
  });

  embed.addFields(fields);

  return { embed };
}

// ---------------------------------------------------------------------------
// leaderboard
// ---------------------------------------------------------------------------

export async function buildLeaderboardEmbed(
  guildId: string,
): Promise<{ embed: EmbedBuilder } | { error: string }> {
  const accounts = await findAllLinkedAccountsInGuild(guildId);

  if (!accounts.length) {
    return {
      error: "❌ Aucun joueur n'a lié son compte Valorant sur ce serveur.",
    };
  }

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const parsed = parseRiotId(account.riotId);

      if (!parsed || !account.region) {
        return null;
      }

      const mmr = await fetchValorantMmr(account.region, parsed.name, parsed.tag);

      return {
        discordUserId: account.discordUserId,
        riotId: account.riotId,
        tier: mmr.current_data?.currenttierpatched ?? "Non classé",
        elo: mmr.current_data?.elo ?? 0,
        change: mmr.current_data?.mmr_change_to_last_game ?? 0,
      };
    }),
  );

  const ranked = results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchValorantMmr>> & {
      discordUserId: string; riotId: string; tier: string; elo: number; change: number;
    } | null> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value!)
    .sort((a, b) => b.elo - a.elo)
    .slice(0, VALORANT_CONSTANTS.LEADERBOARD_SIZE);

  if (!ranked.length) {
    return { error: "❌ Impossible de récupérer les rangs. Réessaie plus tard." };
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = ranked.map((entry, i) => {
    const medal = medals[i] ?? `**${i + 1}.**`;
    const change = formatMmrChange(entry.change);
    return `${medal} <@${entry.discordUserId}> — **${entry.tier}** (${entry.elo} RR · ${change})`;
  });

  const embed = new EmbedBuilder()
    .setColor(VALORANT_CONSTANTS.EMBED_COLOR)
    .setTitle("🏆 Classement Valorant — Serveur")
    .setDescription(lines.join("\n"));

  return { embed };
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

export async function buildStatsEmbed(params: {
  targetDiscordUserId: string;
  guildId: string;
  type: ValorantStatsType;
}): Promise<{ embed: EmbedBuilder } | { error: string }> {
  const linked = await findLinkedAccount(params.targetDiscordUserId, params.guildId);

  if (!linked) {
    return {
      error: "❌ Ce joueur n'a pas lié de compte Valorant. Utilise `/valorant link` d'abord.",
    };
  }

  const parsed = parseRiotId(linked.riotId);

  if (!parsed || !linked.region) {
    return { error: "❌ Les données de ce compte sont corrompues. Relie le compte avec `/valorant link`." };
  }

  let matches: HenrikMatch[];

  try {
    matches = await fetchRecentMatches(
      linked.region,
      parsed.name,
      parsed.tag,
      VALORANT_CONSTANTS.STATS_SIZE,
    );
  } catch (error) {
    if (error instanceof ValorantApiError && error.isNotFound) {
      return { error: "❌ Aucun match trouvé pour ce joueur." };
    }

    logger.error("Failed to fetch Valorant matches for stats", {
      riotId: linked.riotId,
      type: params.type,
      error,
    });

    return { error: "❌ Impossible de récupérer les matchs. Réessaie plus tard." };
  }

  const playerMatches = matches
    .map((match) => ({
      match,
      player: linked.puuid ? getPlayerInMatch(match, linked.puuid) : null,
    }))
    .filter((m): m is { match: HenrikMatch; player: HenrikMatchPlayer } => m.player !== null);

  if (!playerMatches.length) {
    return { error: "❌ Aucune donnée de joueur trouvée dans les matchs récents." };
  }

  const embed = new EmbedBuilder()
    .setColor(VALORANT_CONSTANTS.EMBED_COLOR)
    .setFooter({ text: `Sur les ${playerMatches.length} derniers matchs` });

  if (params.type === "global") {
    const wins = playerMatches.filter(({ match, player }) => didPlayerWin(match, player)).length;
    const totals = playerMatches.reduce(
      (acc, { player }) => ({
        kills: acc.kills + player.stats.kills,
        deaths: acc.deaths + player.stats.deaths,
        assists: acc.assists + player.stats.assists,
        score: acc.score + player.stats.score,
      }),
      { kills: 0, deaths: 0, assists: 0, score: 0 },
    );
    const n = playerMatches.length;
    const kd = totals.deaths > 0 ? (totals.kills / totals.deaths).toFixed(2) : "∞";

    embed
      .setTitle(`📊 Statistiques globales de ${linked.riotId}`)
      .addFields(
        { name: "Victoires", value: `${wins}/${n} (${Math.round((wins / n) * 100)}%)`, inline: true },
        { name: "K/D/A moyen", value: `${(totals.kills / n).toFixed(1)}/${(totals.deaths / n).toFixed(1)}/${(totals.assists / n).toFixed(1)}`, inline: true },
        { name: "Ratio K/D", value: kd, inline: true },
        { name: "Score moyen", value: `${Math.round(totals.score / n)}`, inline: true },
      );
  } else if (params.type === "agent") {
    const byAgent = new Map<string, { games: number; wins: number; kills: number; deaths: number; assists: number }>();

    for (const { match, player } of playerMatches) {
      const agent = player.character;
      const entry = byAgent.get(agent) ?? { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      entry.games++;
      if (didPlayerWin(match, player)) entry.wins++;
      entry.kills += player.stats.kills;
      entry.deaths += player.stats.deaths;
      entry.assists += player.stats.assists;
      byAgent.set(agent, entry);
    }

    const sorted = [...byAgent.entries()].sort((a, b) => b[1].games - a[1].games).slice(0, 5);

    embed
      .setTitle(`🕵️ Stats par agent de ${linked.riotId}`)
      .addFields(
        sorted.map(([agent, s]) => ({
          name: agent,
          value: `${s.games} parties · ${s.wins}V/${s.games - s.wins}D · ${formatKda(
            Math.round(s.kills / s.games),
            Math.round(s.deaths / s.games),
            Math.round(s.assists / s.games),
          )} KDA moy.`,
          inline: false,
        })),
      );
  } else if (params.type === "map") {
    const byMap = new Map<string, { games: number; wins: number }>();

    for (const { match, player } of playerMatches) {
      const map = match.metadata.map;
      const entry = byMap.get(map) ?? { games: 0, wins: 0 };
      entry.games++;
      if (didPlayerWin(match, player)) entry.wins++;
      byMap.set(map, entry);
    }

    const sorted = [...byMap.entries()].sort((a, b) => b[1].games - a[1].games);

    embed
      .setTitle(`🗺️ Stats par map de ${linked.riotId}`)
      .addFields(
        sorted.map(([map, s]) => ({
          name: map,
          value: `${s.games} parties · ${s.wins}V/${s.games - s.wins}D (${Math.round((s.wins / s.games) * 100)}% victoires)`,
          inline: false,
        })),
      );
  } else if (params.type === "playtime") {
    const totalSeconds = matches.reduce((acc, m) => acc + m.metadata.game_length, 0);

    embed
      .setTitle(`⏱️ Temps de jeu de ${linked.riotId}`)
      .addFields(
        { name: "Temps total", value: formatPlaytime(totalSeconds), inline: true },
        { name: "Durée moyenne", value: formatPlaytime(Math.round(totalSeconds / matches.length)), inline: true },
        { name: "Parties", value: `${playerMatches.length}`, inline: true },
      );
  }

  return { embed };
}

// ── Menu-driven handlers ──────────────────────────────────────────────────────

function buildValorantHelpEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(VALORANT_CONSTANTS.EMBED_COLOR)
    .setTitle("🎮 Commandes Valorant")
    .setDescription("Toutes les actions disponibles.")
    .addFields(
      {
        name: "🔗 Lier mon compte",
        value:
          "Associe ton Riot ID à ton profil Discord.\n" +
          "→ Nécessaire avant d'utiliser les autres actions.\n" +
          "Exemple : `Player#EUW`",
      },
      {
        name: "📊 Mes résultats",
        value: "Affiche tes derniers matchs avec K/D, résultats et rang.",
      },
      {
        name: "📈 Mes stats",
        value:
          "Statistiques détaillées de tes parties :\n" +
          "• **Global** — K/D, winrate, headshot%…\n" +
          "• **Par agent** — stats par personnage joué\n" +
          "• **Par map** — winrate par carte\n" +
          "• **Temps de jeu** — heures passées en jeu",
      },
      {
        name: "🏆 Classement",
        value:
          "Classement des membres du serveur par rang.\n" +
          "→ Seuls les joueurs ayant lié leur compte apparaissent.",
      },
    )
    .setFooter({ text: "Données provenant de tracker.gg via Henrik API" });
}

function buildValorantMainMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId(VALORANT_MENU_ID)
    .setPlaceholder("Choisir une action…")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Lier mon compte").setValue("link").setEmoji("🔗")
        .setDescription("Associer ton Riot ID à ton profil Discord"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Mes résultats").setValue("results").setEmoji("📊")
        .setDescription("Voir tes derniers résultats Valorant"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Mes stats").setValue("stats").setEmoji("📈")
        .setDescription("Statistiques détaillées de tes parties"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Classement").setValue("leaderboard").setEmoji("🏆")
        .setDescription("Classement Valorant du serveur"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Aide").setValue("help").setEmoji("❓")
        .setDescription("Voir toutes les actions disponibles"),
    );

  return {
    content: "🎯 **Valorant** — Que veux-tu faire ?",
    embeds: [] as EmbedBuilder[],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}

async function postToChannel(
  interaction: StringSelectMenuInteraction,
  payload: { content?: string; embeds?: EmbedBuilder[] },
): Promise<void> {
  if (interaction.channel?.isSendable()) {
    await interaction.channel.send(payload);
  } else {
    await interaction.followUp(payload);
  }
}

function buildValorantBackRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(VALORANT_BACK_BTN_ID)
      .setLabel("↩ Revenir au menu")
      .setStyle(ButtonStyle.Secondary),
  );
}

export async function handleValorantCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "❌ Cette commande doit être utilisée dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
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

  await interaction.reply({ ...buildValorantMainMenu(), flags: MessageFlags.Ephemeral });
}

export async function handleValorantMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const value = interaction.values[0];

  if (value === "link") {
    const modal = new ModalBuilder()
      .setCustomId(VALORANT_MODAL_LINK_ID)
      .setTitle("Lier mon compte Valorant");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(VALORANT_INPUT_RIOT_ID)
          .setLabel("Riot ID")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Player#EUW")
          .setRequired(true)
          .setMaxLength(40),
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  if (value === "results") {
    await interaction.update({ content: "⏳ Récupération des résultats…", embeds: [], components: [] });

    const result = await buildResultsEmbed({
      targetDiscordUserId: interaction.user.id,
      guildId,
    });

    if ("error" in result) {
      await interaction.editReply({ content: result.error, embeds: [], components: [buildValorantBackRow()] });
      return;
    }

    await postToChannel(interaction, { embeds: [result.embed] });
    await interaction.editReply({ content: "✅ Résultats postés dans le salon.", embeds: [], components: [buildValorantBackRow()] });
    return;
  }

  if (value === "stats") {
    const statsSelect = new StringSelectMenuBuilder()
      .setCustomId(VALORANT_STATS_SELECT_ID)
      .setPlaceholder("Choisir le type de statistiques…")
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Global").setValue("global").setEmoji("📊")
          .setDescription("K/D, winrate, headshot%…"),
        new StringSelectMenuOptionBuilder().setLabel("Par agent").setValue("agent").setEmoji("🕵️")
          .setDescription("Stats par personnage joué"),
        new StringSelectMenuOptionBuilder().setLabel("Par map").setValue("map").setEmoji("🗺️")
          .setDescription("Winrate par carte"),
        new StringSelectMenuOptionBuilder().setLabel("Temps de jeu").setValue("playtime").setEmoji("⏱️")
          .setDescription("Heures passées en jeu"),
      );

    await interaction.update({
      content: "📈 **Mes stats** — Choisis le type :",
      embeds: [],
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(statsSelect),
        buildValorantBackRow(),
      ],
    });
    return;
  }

  if (value === "leaderboard") {
    await interaction.update({ content: "⏳ Récupération du classement…", embeds: [], components: [] });

    const result = await buildLeaderboardEmbed(guildId);

    if ("error" in result) {
      await interaction.editReply({ content: result.error, embeds: [], components: [buildValorantBackRow()] });
      return;
    }

    await postToChannel(interaction, { embeds: [result.embed] });
    await interaction.editReply({ content: "✅ Classement posté dans le salon.", embeds: [], components: [buildValorantBackRow()] });
    return;
  }

  if (value === "help") {
    await interaction.update({
      content: "",
      embeds: [buildValorantHelpEmbed()],
      components: [buildValorantBackRow()],
    });
    return;
  }
}

export async function handleValorantBack(interaction: ButtonInteraction): Promise<void> {
  await interaction.update(buildValorantMainMenu());
}

export async function handleValorantLinkModal(interaction: ModalSubmitInteraction): Promise<void> {
  const riotId  = interaction.fields.getTextInputValue(VALORANT_INPUT_RIOT_ID);
  const guildId = interaction.guildId;
  if (!guildId) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await linkValorantAccount({
    discordUserId: interaction.user.id,
    guildId,
    riotId,
  });

  await interaction.editReply({ content: result.message });
}

export async function handleValorantStatsSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const type = interaction.values[0] as ValorantStatsType;

  await interaction.update({ content: "⏳ Récupération des stats…", embeds: [], components: [] });

  const result = await buildStatsEmbed({
    targetDiscordUserId: interaction.user.id,
    guildId,
    type,
  });

  if ("error" in result) {
    await interaction.editReply({ content: result.error, embeds: [], components: [buildValorantBackRow()] });
    return;
  }

  await postToChannel(interaction, { embeds: [result.embed] });
  await interaction.editReply({ content: "✅ Stats postées dans le salon.", embeds: [], components: [buildValorantBackRow()] });
}
