import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { env } from "../../../core/config/env.js";
import { STEAM_CONSTANTS } from "../domain/steam.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl, searchSteamGames } from "./steam.api.js";
import { getITADDeals, lookupITADGame } from "./itad.api.js";
import {
  deleteGame,
  getChannelPermissions,
  getGameByAppId,
  getGamesForGuild,
  insertGame,
} from "./steam.repository.js";

// ── Permission ────────────────────────────────────────────────────────────────

async function checkPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const guildId = interaction.guildId;
  if (!guildId) return true;

  const rules = await getChannelPermissions(guildId);
  if (rules.length === 0) return true; // Pas de règles → tout le monde peut utiliser

  const channelRules = rules.filter((r) => r.channelId === interaction.channelId);
  if (channelRules.length === 0) return false;

  const member = interaction.member as GuildMember | null;
  if (!member) return false;

  return channelRules.some((r) => member.roles.cache.has(r.roleId));
}

// ── /steam add ────────────────────────────────────────────────────────────────

async function handleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString("titre", true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const results = await searchSteamGames(query);

  if (results.length === 0) {
    await interaction.editReply("❌ Aucun jeu trouvé sur Steam pour cette recherche.");
    return;
  }

  const options = results.map((r) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(r.name.slice(0, 100))
      .setValue(String(r.id))
      .setDescription(
        r.price
          ? r.price.discount_percent > 0
            ? `En promo — ${r.price.final_formatted} (-${r.price.discount_percent}%)`
            : r.price.final_formatted
          : "Gratuit",
      ),
  );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("steam:add:select")
      .setPlaceholder("Sélectionne le jeu à ajouter…")
      .addOptions(options),
  );

  await interaction.editReply({ content: "🔍 Résultats pour **" + query + "** :", components: [row] });
}

// ── /steam list ───────────────────────────────────────────────────────────────

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const games = await getGamesForGuild(guildId);

  if (games.length === 0) {
    await interaction.reply({
      content: "📋 Aucun jeu tracké. Utilise `/steam add` pour en ajouter.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const lines = games.map((g) => {
    const priceStr = g.lastKnownPriceEur !== null
      ? g.isOnSale
        ? `~~${formatEur(Math.round(g.lastKnownPriceEur / (1 - (g.lastKnownDiscount ?? 0) / 100)))}~~ **${formatEur(g.lastKnownPriceEur)}** (-${g.lastKnownDiscount}%)`
        : formatEur(g.lastKnownPriceEur)
      : "Prix inconnu";

    const icon = g.isOnSale ? "🔴" : "⚪";
    return `${icon} **[${g.title}](${getSteamUrl(g.steamAppId)})** — ${priceStr}`;
  });

  const description = lines.join("\n");
  const truncated = description.length > 3800
    ? description.slice(0, 3800) + "\n…*(liste tronquée)*"
    : description;

  const checkedNote = games.some((g) => g.lastCheckedAt)
    ? ""
    : "\n\n*Les prix seront mis à jour au prochain passage du tracker (toutes les 6h).*";

  const embed = new EmbedBuilder()
    .setColor(STEAM_CONSTANTS.EMBED_COLOR)
    .setTitle(`🎮 Jeux trackés (${games.length})`)
    .setDescription(truncated + checkedNote);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── /steam prix ───────────────────────────────────────────────────────────────

async function handlePrix(interaction: ChatInputCommandInteraction): Promise<void> {
  const rawValue = interaction.options.getString("titre", true);
  const steamAppId = parseInt(rawValue, 10);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (isNaN(steamAppId)) {
    await interaction.editReply("❌ Utilise l'autocomplétion pour choisir un jeu de la liste.");
    return;
  }

  const guildId = interaction.guildId!;
  const game = await getGameByAppId(guildId, steamAppId);
  if (!game) {
    await interaction.editReply("❌ Ce jeu n'est pas dans la liste du serveur.");
    return;
  }

  // Prix Steam
  const details = await getSteamAppDetails(steamAppId);
  const steamPrice = details?.price_overview;

  const lines: string[] = [];

  if (details?.is_free) {
    lines.push("🟢 **Steam** — Gratuit");
  } else if (steamPrice) {
    const saleStr = steamPrice.discount_percent > 0
      ? ` ~~${steamPrice.initial_formatted}~~ (-${steamPrice.discount_percent}%)`
      : "";
    lines.push(`🟢 **[Steam](${getSteamUrl(steamAppId)})** — **${steamPrice.final_formatted}**${saleStr}`);
  } else {
    lines.push(`🟢 **[Steam](${getSteamUrl(steamAppId)})** — Prix indisponible`);
  }

  // Prix ITAD (si clé configurée)
  let itadLine = "";
  if (env.ITAD_API_KEY) {
    const itadGame = await lookupITADGame(steamAppId, env.ITAD_API_KEY);
    if (itadGame) {
      const deals = await getITADDeals(itadGame.id, env.ITAD_API_KEY);
      const others = deals
        .filter((d) => d.shop.id !== "steam")
        .sort((a, b) => a.price.amount - b.price.amount)
        .slice(0, 5);

      if (others.length > 0) {
        lines.push("");
        lines.push("**Autres boutiques :**");
        for (const deal of others) {
          const saleStr = deal.cut > 0 ? ` (-${deal.cut}%)` : "";
          lines.push(`🏷 **[${deal.shop.name}](${deal.url})** — ${deal.price.amount.toFixed(2)} €${saleStr}`);
        }
        itadLine = `\n\n[Voir toutes les offres sur ITAD](https://isthereanydeal.com/game/${itadGame.slug}/info/)`;
      }
    }
  } else {
    lines.push("\n*Comparaison multi-boutiques désactivée (ITAD_API_KEY non configuré)*");
  }

  const embed = new EmbedBuilder()
    .setColor(STEAM_CONSTANTS.EMBED_COLOR_PRICES)
    .setTitle(`💰 Prix — ${game.title}`)
    .setThumbnail(game.headerImage ?? null)
    .setDescription(lines.join("\n") + itadLine);

  await interaction.editReply({ embeds: [embed] });
}

// ── /steam remove ─────────────────────────────────────────────────────────────

async function handleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const rawValue = interaction.options.getString("titre", true);
  const steamAppId = parseInt(rawValue, 10);

  if (isNaN(steamAppId)) {
    await interaction.reply({
      content: "❌ Utilise l'autocomplétion pour choisir un jeu de la liste.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = interaction.guildId!;
  const game = await getGameByAppId(guildId, steamAppId);

  if (!game) {
    await interaction.reply({
      content: "❌ Ce jeu n'est pas dans la liste du serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await deleteGame(game.id);

  await interaction.reply({
    content: `✅ **${game.title}** retiré de la liste.`,
    flags: MessageFlags.Ephemeral,
  });

  logger.info("[steam] jeu retiré", { guildId, title: game.title, steamAppId });
}

// ── /steam promos ─────────────────────────────────────────────────────────────

async function handlePromos(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const games = await getGamesForGuild(guildId);
  const onSale = games.filter((g) => g.isOnSale === 1);

  if (onSale.length === 0) {
    const note = games.some((g) => g.lastCheckedAt)
      ? "Aucun jeu de la liste n'est en promo en ce moment."
      : "Aucun jeu en promo. Le tracker n'a pas encore passé — reviens dans quelques minutes.";

    await interaction.reply({ content: `ℹ️ ${note}`, flags: MessageFlags.Ephemeral });
    return;
  }

  const lines = onSale.map((g) => {
    const priceStr = g.lastKnownPriceEur !== null
      ? `**${formatEur(g.lastKnownPriceEur)}** (-${g.lastKnownDiscount ?? 0}%)`
      : "Prix en promo";
    return `🏷 **[${g.title}](${getSteamUrl(g.steamAppId)})** — ${priceStr}`;
  });

  const embed = new EmbedBuilder()
    .setColor(STEAM_CONSTANTS.EMBED_COLOR_SALE)
    .setTitle(`🔥 Promos en cours (${onSale.length})`)
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Mis à jour toutes les 6h par le tracker" });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function handleSteamCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Cette commande n'est disponible que dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }

  const allowed = await checkPermission(interaction);
  if (!allowed) {
    await interaction.reply({
      content: "❌ Tu n'as pas la permission d'utiliser cette commande dans ce salon.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const sub = interaction.options.getSubcommand(true);

  try {
    if (sub === "add")    { await handleAdd(interaction);    return; }
    if (sub === "list")   { await handleList(interaction);   return; }
    if (sub === "prix")   { await handlePrix(interaction);   return; }
    if (sub === "remove") { await handleRemove(interaction); return; }
    if (sub === "promos") { await handlePromos(interaction); return; }
  } catch (error) {
    logger.error("[steam] erreur commande", { sub, userId: interaction.user.id, error });
    const msg = "❌ Une erreur est survenue.";
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply(msg).catch(() => null);
    } else {
      await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => null);
    }
  }
}

// ── Handler StringSelectMenu — confirmation d'ajout ───────────────────────────

export async function handleSteamAddSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(steamAppId)) {
    await interaction.update({ content: "❌ Valeur invalide.", components: [] });
    return;
  }

  await interaction.update({ content: "⏳ Récupération des infos Steam…", components: [] });

  const existing = await getGameByAppId(guildId, steamAppId);
  if (existing) {
    await interaction.editReply({ content: `ℹ️ **${existing.title}** est déjà dans la liste.` });
    return;
  }

  const details = await getSteamAppDetails(steamAppId);
  const title = details?.name ?? `App ${steamAppId}`;
  const headerImage = details?.header_image ?? null;

  await insertGame({
    guildId,
    steamAppId,
    title,
    headerImage,
    addedBy: interaction.user.id,
    addedByName: interaction.user.displayName ?? interaction.user.username,
  });

  const priceStr = details?.is_free
    ? "Gratuit"
    : details?.price_overview
      ? details.price_overview.final_formatted
      : "Prix inconnu";

  await interaction.editReply({
    content: `✅ **${title}** ajouté à la liste. (${priceStr})`,
  });

  logger.info("[steam] jeu ajouté", { guildId, title, steamAppId, userId: interaction.user.id });
}

// ── Handler autocomplétion ────────────────────────────────────────────────────

export async function handleSteamAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) { await interaction.respond([]); return; }

  const focused = interaction.options.getFocused().toLowerCase();
  const games = await getGamesForGuild(guildId);

  const filtered = games
    .filter((g) => g.title.toLowerCase().includes(focused))
    .slice(0, 25)
    .map((g) => ({ name: g.title.slice(0, 100), value: String(g.steamAppId) }));

  await interaction.respond(filtered);
}
