import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChannelSelectMenuInteraction,
  type ChatInputCommandInteraction,
  type GuildMember,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { env } from "../../../core/config/env.js";
import {
  DEALS_ADD_SELECT_ID,
  DEALS_BACK_BTN_ID,
  DEALS_CONFIG_CHAN_ID,
  DEALS_CONSTANTS,
  DEALS_MAIN_MENU_ID,
  DEALS_PRICE_SELECT_ID,
  DEALS_REMOVE_SELECT_ID,
  DEALS_SEARCH_INPUT,
  DEALS_SEARCH_MODAL_ID,
} from "../domain/deals.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl, searchSteamGames } from "./deals.api.js";
import { getITADDeals, lookupITADGame } from "./itad.api.js";
import {
  getAllConfigs,
  getAllGames,
  getConfig,
  getGameByAppId,
  getGames,
  insertGame,
  removeGame,
  setNotifChannel,
  updateGamePrice,
} from "./deals.repository.js";

// ── Permission ────────────────────────────────────────────────────────────────

function hasPermission(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction | ButtonInteraction | ModalSubmitInteraction | ChannelSelectMenuInteraction): boolean {
  const member = interaction.member as GuildMember | null;
  if (!member) return false;
  const perms = member.permissions;
  if (typeof perms === "string") return false;
  return perms.has(PermissionFlagsBits.Administrator) ||
         perms.has(PermissionFlagsBits.ModerateMembers) ||
         perms.has(PermissionFlagsBits.ManageGuild);
}

// ── Builders ──────────────────────────────────────────────────────────────────

function buildBackRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(DEALS_BACK_BTN_ID).setLabel("↩ Menu").setStyle(ButtonStyle.Secondary),
  );
}

async function buildMainMenu(guildId: string, channelId: string) {
  const games  = await getGames(guildId, channelId);
  const config = await getConfig(guildId, channelId);
  const onSale = games.filter((g) => g.isOnSale === 1).length;

  let header = `🎮 **Deals** — ${games.length} jeu${games.length !== 1 ? "x" : ""} tracké${games.length !== 1 ? "s" : ""}`;
  if (onSale > 0) header += ` · 🔥 ${onSale} en promo`;
  if (config?.notifChannelId) header += `\n📢 Notifs : <#${config.notifChannelId}>`;

  const select = new StringSelectMenuBuilder()
    .setCustomId(DEALS_MAIN_MENU_ID)
    .setPlaceholder("Choisir une action…")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("📋 Voir la liste").setValue("voir")
        .setDescription("Afficher tous les jeux et leurs prix"),
      new StringSelectMenuOptionBuilder().setLabel("🔍 Ajouter un jeu").setValue("ajouter")
        .setDescription("Rechercher et ajouter un jeu Steam"),
      new StringSelectMenuOptionBuilder().setLabel("🗑 Retirer un jeu").setValue("retirer")
        .setDescription("Supprimer un jeu de la liste"),
      new StringSelectMenuOptionBuilder().setLabel("🔥 Promos en cours").setValue("promos")
        .setDescription("Voir les jeux actuellement en promotion"),
      new StringSelectMenuOptionBuilder().setLabel("💰 Comparer les prix").setValue("prix")
        .setDescription("Comparer prix Steam et revendeurs"),
      new StringSelectMenuOptionBuilder().setLabel("⚙️ Salon de notifications").setValue("config")
        .setDescription("Changer le salon où les alertes promo sont envoyées"),
    );

  return {
    content: header,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    embeds: [] as EmbedBuilder[],
  };
}

// ── /deals ────────────────────────────────────────────────────────────────────

export async function handleDealsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Commande disponible uniquement dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (!hasPermission(interaction)) {
    await interaction.reply({ content: "❌ Cette commande est réservée aux administrateurs et modérateurs.", flags: MessageFlags.Ephemeral });
    return;
  }
  const menu = await buildMainMenu(interaction.guildId, interaction.channelId);
  await interaction.reply({ ...menu, flags: MessageFlags.Ephemeral });
}

// ── Menu principal ────────────────────────────────────────────────────────────

export async function handleDealsMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  if (!hasPermission(interaction)) {
    await interaction.update({ content: "❌ Accès refusé.", components: [], embeds: [] });
    return;
  }

  const guildId   = interaction.guildId;
  const channelId = interaction.channelId;
  const value     = interaction.values[0];

  // ── Voir ───────────────────────────────────────────────────────────────────
  if (value === "voir") {
    const games = await getGames(guildId, channelId);
    if (games.length === 0) {
      await interaction.update({ content: "📋 Aucun jeu dans la liste pour l'instant.", components: [buildBackRow()], embeds: [] });
      return;
    }
    const lines = games.map((g) => {
      const priceStr = g.lastKnownPriceEur !== null
        ? g.isOnSale === 1
          ? `~~${formatEur(Math.round(g.lastKnownPriceEur / (1 - (g.lastKnownDiscount ?? 0) / 100)))}~~ **${formatEur(g.lastKnownPriceEur)}** (-${g.lastKnownDiscount ?? 0}%)`
          : formatEur(g.lastKnownPriceEur)
        : "Prix inconnu";
      return `${g.isOnSale === 1 ? "🔴" : "⚪"} **[${g.title}](${getSteamUrl(g.steamAppId)})** — ${priceStr}`;
    });
    const embed = new EmbedBuilder()
      .setColor(DEALS_CONSTANTS.EMBED_COLOR)
      .setTitle(`📋 Liste — ${games.length} jeu${games.length !== 1 ? "x" : ""}`)
      .setDescription(lines.join("\n").slice(0, 4000));
    await interaction.update({ content: "", embeds: [embed], components: [buildBackRow()] });
    return;
  }

  // ── Ajouter ────────────────────────────────────────────────────────────────
  if (value === "ajouter") {
    const modal = new ModalBuilder().setCustomId(DEALS_SEARCH_MODAL_ID).setTitle("Ajouter un jeu");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(DEALS_SEARCH_INPUT)
          .setLabel("Rechercher un jeu Steam")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Portal 2, Elden Ring, Cyberpunk…")
          .setRequired(true)
          .setMaxLength(100),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  // ── Retirer ────────────────────────────────────────────────────────────────
  if (value === "retirer") {
    const games = await getGames(guildId, channelId);
    if (games.length === 0) {
      await interaction.update({ content: "📋 Aucun jeu à retirer.", components: [buildBackRow()], embeds: [] });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(DEALS_REMOVE_SELECT_ID)
      .setPlaceholder("Choisir un jeu à retirer…")
      .addOptions(games.slice(0, 25).map((g) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(g.title.slice(0, 100))
          .setValue(String(g.steamAppId))
          .setDescription(g.isOnSale === 1 ? "🔥 En promo" : "Prix standard"),
      ));
    await interaction.update({
      content: "🗑 **Retirer un jeu** — Choisis :",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), buildBackRow()],
      embeds: [],
    });
    return;
  }

  // ── Promos ─────────────────────────────────────────────────────────────────
  if (value === "promos") {
    const games  = await getGames(guildId, channelId);
    const onSale = games.filter((g) => g.isOnSale === 1);
    if (onSale.length === 0) {
      const note = games.some((g) => g.lastCheckedAt)
        ? "Aucun jeu en promo en ce moment."
        : "Le tracker n'a pas encore tourné — reviens dans quelques minutes.";
      await interaction.update({ content: `ℹ️ ${note}`, components: [buildBackRow()], embeds: [] });
      return;
    }
    const lines = onSale.map((g) =>
      `🏷 **[${g.title}](${getSteamUrl(g.steamAppId)})** — **${formatEur(g.lastKnownPriceEur!)}** (-${g.lastKnownDiscount ?? 0}%)`,
    );
    const embed = new EmbedBuilder()
      .setColor(DEALS_CONSTANTS.EMBED_COLOR_SALE)
      .setTitle(`🔥 Promos en cours (${onSale.length})`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Mis à jour toutes les 6h" });
    await interaction.update({ content: "", embeds: [embed], components: [buildBackRow()] });
    return;
  }

  // ── Prix ───────────────────────────────────────────────────────────────────
  if (value === "prix") {
    const games = await getGames(guildId, channelId);
    if (games.length === 0) {
      await interaction.update({ content: "ℹ️ Aucun jeu dans la liste.", components: [buildBackRow()], embeds: [] });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(DEALS_PRICE_SELECT_ID)
      .setPlaceholder("Choisir un jeu…")
      .addOptions(games.slice(0, 25).map((g) =>
        new StringSelectMenuOptionBuilder().setLabel(g.title.slice(0, 100)).setValue(String(g.steamAppId)),
      ));
    await interaction.update({
      content: "💰 **Comparer les prix** — Choisis un jeu :",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), buildBackRow()],
      embeds: [],
    });
    return;
  }

  // ── Config ─────────────────────────────────────────────────────────────────
  if (value === "config") {
    const config = await getConfig(guildId, channelId);
    const chanSelect = new ChannelSelectMenuBuilder()
      .setCustomId(DEALS_CONFIG_CHAN_ID)
      .setPlaceholder("Choisir le salon de notifications…")
      .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
    await interaction.update({
      content: `⚙️ **Salon de notifications**\nActuel : ${config?.notifChannelId ? `<#${config.notifChannelId}>` : "non configuré"}\n\nChoisis le salon où les alertes promo seront envoyées :`,
      components: [
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(chanSelect),
        buildBackRow(),
      ],
      embeds: [],
    });
    return;
  }
}

// ── Bouton Retour ─────────────────────────────────────────────────────────────

export async function handleDealsBack(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const menu = await buildMainMenu(interaction.guildId, interaction.channelId);
  await interaction.update(menu);
}

// ── Recherche (modal) ─────────────────────────────────────────────────────────

export async function handleDealsSearchModal(interaction: ModalSubmitInteraction): Promise<void> {
  const query = interaction.fields.getTextInputValue(DEALS_SEARCH_INPUT).trim();
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const results = await searchSteamGames(query);
    if (results.length === 0) {
      await interaction.editReply("❌ Aucun résultat pour cette recherche.");
      return;
    }
    const options = results.map((r) => {
      const priceLabel = r.price
        ? r.price.discount_percent > 0
          ? `En promo — ${r.price.final_formatted || formatEur(r.price.final)} (-${r.price.discount_percent}%)`
          : r.price.final_formatted || formatEur(r.price.final) || "Prix non disponible"
        : "Gratuit";
      return new StringSelectMenuOptionBuilder()
        .setLabel(r.name.slice(0, 100))
        .setValue(String(r.id))
        .setDescription((priceLabel || "Prix non disponible").slice(0, 100));
    });
    const select = new StringSelectMenuBuilder()
      .setCustomId(DEALS_ADD_SELECT_ID)
      .setPlaceholder("Choisir le jeu à ajouter…")
      .addOptions(options);
    await interaction.editReply({
      content: `🔍 Résultats pour **${query}** :`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  } catch (err) {
    logger.error("[deals] handleDealsSearchModal", { err });
    await interaction.editReply("❌ Erreur lors de la recherche. Réessaie.").catch(() => null);
  }
}

// ── Ajouter un jeu (select) ───────────────────────────────────────────────────

export async function handleDealsAddSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(steamAppId)) { await interaction.update({ content: "❌ Valeur invalide.", components: [] }); return; }

  await interaction.update({ content: "⏳ Récupération des infos Steam…", components: [], embeds: [] });

  const { guildId, channelId } = interaction;
  const existing = await getGameByAppId(guildId, channelId, steamAppId);
  if (existing) {
    await interaction.editReply({ content: `ℹ️ **${existing.title}** est déjà dans la liste.`, components: [buildBackRow()] });
    return;
  }

  const details = await getSteamAppDetails(steamAppId);
  const title         = details?.name ?? `App ${steamAppId}`;
  const headerImage   = details?.header_image ?? null;
  const price         = details?.price_overview;
  const lastKnownPriceEur = details?.is_free ? 0 : (price?.final ?? null);
  const lastKnownDiscount = price?.discount_percent ?? 0;
  const isOnSale      = lastKnownDiscount > 0 ? 1 : 0;

  await insertGame({
    guildId, channelId, steamAppId, title, headerImage,
    addedById: interaction.user.id,
    addedByName: interaction.user.displayName ?? interaction.user.username,
    lastKnownPriceEur, lastKnownDiscount, isOnSale,
    lastCheckedAt: new Date().toISOString(),
  });

  const priceStr = details?.is_free ? "Gratuit" : price?.final_formatted ?? "Prix inconnu";
  await interaction.editReply({ content: `✅ **${title}** ajouté à la liste. (${priceStr})`, components: [buildBackRow()] });
  logger.info("[deals] jeu ajouté", { guildId, channelId, title, steamAppId });
}

// ── Retirer un jeu ────────────────────────────────────────────────────────────

export async function handleDealsRemoveSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  const game = await getGameByAppId(interaction.guildId, interaction.channelId, steamAppId);
  if (!game) { await interaction.update({ content: "❌ Jeu introuvable.", components: [], embeds: [] }); return; }

  await removeGame(game.id);
  await interaction.update({ content: `✅ **${game.title}** retiré de la liste.`, components: [buildBackRow()], embeds: [] });
  logger.info("[deals] jeu retiré", { title: game.title, steamAppId });
}

// ── Comparer les prix ─────────────────────────────────────────────────────────

export async function handleDealsPriceSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  await interaction.update({ content: "⏳ Récupération des prix…", components: [buildBackRow()], embeds: [] });

  const game = await getGameByAppId(interaction.guildId, interaction.channelId, steamAppId);
  if (!game) { await interaction.editReply({ content: "❌ Jeu introuvable.", components: [buildBackRow()] }); return; }

  const details    = await getSteamAppDetails(steamAppId);
  const steamPrice = details?.price_overview;
  const lines: string[] = [];

  if (details?.is_free) {
    lines.push("🟢 **Steam** — Gratuit");
  } else if (steamPrice) {
    const saleStr = steamPrice.discount_percent > 0 ? ` ~~${steamPrice.initial_formatted}~~ (-${steamPrice.discount_percent}%)` : "";
    lines.push(`🟢 **[Steam](${getSteamUrl(steamAppId)})** — **${steamPrice.final_formatted}**${saleStr}`);
  } else {
    lines.push(`🟢 **[Steam](${getSteamUrl(steamAppId)})** — Prix indisponible`);
  }

  if (env.ITAD_API_KEY) {
    const itadGame = await lookupITADGame(steamAppId, env.ITAD_API_KEY);
    if (itadGame) {
      const deals  = await getITADDeals(itadGame.id, env.ITAD_API_KEY);
      const others = deals.filter((d) => d.shop.id !== "steam").sort((a, b) => a.price.amount - b.price.amount).slice(0, 5);
      if (others.length > 0) {
        lines.push("", "**Autres boutiques :**");
        for (const deal of others) {
          lines.push(`🏷 **[${deal.shop.name}](${deal.url})** — ${deal.price.amount.toFixed(2)} €${deal.cut > 0 ? ` (-${deal.cut}%)` : ""}`);
        }
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(DEALS_CONSTANTS.EMBED_COLOR_PRICES)
    .setTitle(`💰 Prix — ${game.title}`)
    .setThumbnail(game.headerImage ?? null)
    .setDescription(lines.join("\n"));

  await interaction.editReply({ content: "", embeds: [embed], components: [buildBackRow()] });
}

// ── Config — salon de notifs ──────────────────────────────────────────────────

export async function handleDealsConfigChannel(interaction: ChannelSelectMenuInteraction): Promise<void> {
  if (!interaction.guildId) return;
  const channel = interaction.channels.first();
  if (!channel) { await interaction.update({ content: "❌ Salon invalide.", components: [], embeds: [] }); return; }

  await setNotifChannel(interaction.guildId, interaction.channelId, channel.id);
  await interaction.update({
    content: `✅ Salon de notifications mis à jour : <#${channel.id}>\nLes alertes promo seront envoyées dans ce salon.`,
    components: [buildBackRow()],
    embeds: [],
  });
  logger.info("[deals] notif channel mis à jour", { guildId: interaction.guildId, channelId: interaction.channelId, notifChannelId: channel.id });
}
