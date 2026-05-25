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
  type GuildMember,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { env } from "../../../core/config/env.js";
import {
  STEAM_ADD_SELECT_ID,
  STEAM_BACK_BTN_ID,
  STEAM_CONSTANTS,
  STEAM_INPUT_NAME_ID,
  STEAM_MENU_ID,
  STEAM_MODAL_ADD_ID,
  STEAM_PRICE_SELECT_ID,
  STEAM_REMOVE_SELECT_ID,
} from "../domain/steam.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl, searchSteamGames } from "./steam.api.js";
import { getITADDeals, lookupITADGame } from "./itad.api.js";
import {
  deleteGame,
  getGameByAppId,
  getGamesForGuild,
  getSteamConfig,
  insertGame,
} from "./steam.repository.js";

// ── UI helpers ────────────────────────────────────────────────────────────────

function buildMainMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId(STEAM_MENU_ID)
    .setPlaceholder("Choisir une action…")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Ajouter un jeu").setValue("add").setEmoji("🔍")
        .setDescription("Rechercher et ajouter un jeu Steam à la liste"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Voir la liste").setValue("list").setEmoji("📋")
        .setDescription("Afficher les jeux trackés avec leurs prix"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Comparer les prix").setValue("price").setEmoji("💰")
        .setDescription("Voir les prix Steam et sur les revendeurs"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Retirer un jeu").setValue("remove").setEmoji("🗑️")
        .setDescription("Supprimer un jeu de la liste du serveur"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Promos en cours").setValue("deals").setEmoji("🔥")
        .setDescription("Voir les jeux de la liste actuellement en promo"),
    );

  return {
    content: "🎮 **Steam** — Que veux-tu faire ?",
    embeds: [] as EmbedBuilder[],
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}

function buildBackRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(STEAM_BACK_BTN_ID)
      .setLabel("↩ Revenir au menu")
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildGameSelectRow(customId: string, games: { steamAppId: number; title: string }[], placeholder: string) {
  const options = games.slice(0, 25).map((g) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(g.title.slice(0, 100))
      .setValue(String(g.steamAppId)),
  );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options),
  );
}

// ── Permission ────────────────────────────────────────────────────────────────

async function checkPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
  const guildId = interaction.guildId;
  if (!guildId) return true;

  const config = await getSteamConfig(guildId);
  if (!config) return true;

  if (config.notifChannelId && config.notifChannelId !== interaction.channelId) return false;

  if (config.notifRoleId) {
    const member = interaction.member as GuildMember | null;
    if (!member) return false;
    if (!member.roles.cache.has(config.notifRoleId)) return false;
  }

  return true;
}

// ── Commande /steam ───────────────────────────────────────────────────────────

export async function handleSteamCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Commande disponible uniquement dans un serveur.", flags: MessageFlags.Ephemeral });
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

  await interaction.reply({ ...buildMainMenu(), flags: MessageFlags.Ephemeral });
}

// ── Menu principal (StringSelectMenu) ────────────────────────────────────────

export async function handleSteamMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const value = interaction.values[0];

  // ── Ajouter : ouvre un modal de saisie ──────────────────────────────────────
  if (value === "add") {
    const modal = new ModalBuilder()
      .setCustomId(STEAM_MODAL_ADD_ID)
      .setTitle("Ajouter un jeu Steam");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(STEAM_INPUT_NAME_ID)
          .setLabel("Nom du jeu à rechercher")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: Portal 2, Elden Ring, Cyberpunk…")
          .setRequired(true)
          .setMaxLength(100),
      ),
    );

    await interaction.showModal(modal);
    return;
  }

  // ── Liste ────────────────────────────────────────────────────────────────────
  if (value === "list") {
    const games = await getGamesForGuild(guildId);

    if (games.length === 0) {
      await interaction.update({
        content: "📋 Aucun jeu tracké pour l'instant.",
        embeds: [],
        components: [buildBackRow()],
      });
      return;
    }

    const lines = games.map((g) => {
      const priceStr =
        g.lastKnownPriceEur !== null
          ? g.isOnSale
            ? `~~${formatEur(Math.round(g.lastKnownPriceEur / (1 - (g.lastKnownDiscount ?? 0) / 100)))}~~ **${formatEur(g.lastKnownPriceEur)}** (-${g.lastKnownDiscount ?? 0}%)`
            : formatEur(g.lastKnownPriceEur)
          : "Prix inconnu";

      const icon = g.isOnSale ? "🔴" : "⚪";
      return `${icon} **[${g.title}](${getSteamUrl(g.steamAppId)})** — ${priceStr}`;
    });

    const description = lines.join("\n").slice(0, 3800);
    const embed = new EmbedBuilder()
      .setColor(STEAM_CONSTANTS.EMBED_COLOR)
      .setTitle(`🎮 Jeux trackés (${games.length})`)
      .setDescription(description);

    await interaction.update({ content: "", embeds: [embed], components: [buildBackRow()] });
    return;
  }

  // ── Comparer les prix : sélecteur de jeu ────────────────────────────────────
  if (value === "price") {
    const games = await getGamesForGuild(guildId);

    if (games.length === 0) {
      await interaction.update({ content: "ℹ️ Aucun jeu dans la liste.", embeds: [], components: [buildBackRow()] });
      return;
    }

    await interaction.update({
      content: "💰 **Comparer les prix** — Choisis un jeu :",
      embeds: [],
      components: [buildGameSelectRow(STEAM_PRICE_SELECT_ID, games, "Choisir un jeu…"), buildBackRow()],
    });
    return;
  }

  // ── Retirer : sélecteur de jeu ───────────────────────────────────────────────
  if (value === "remove") {
    const games = await getGamesForGuild(guildId);

    if (games.length === 0) {
      await interaction.update({ content: "ℹ️ Aucun jeu dans la liste.", embeds: [], components: [buildBackRow()] });
      return;
    }

    await interaction.update({
      content: "🗑️ **Retirer un jeu** — Choisis le jeu à supprimer :",
      embeds: [],
      components: [buildGameSelectRow(STEAM_REMOVE_SELECT_ID, games, "Choisir un jeu…"), buildBackRow()],
    });
    return;
  }

  // ── Promos ───────────────────────────────────────────────────────────────────
  if (value === "deals") {
    const games = await getGamesForGuild(guildId);
    const onSale = games.filter((g) => g.isOnSale === 1);

    if (onSale.length === 0) {
      const note = games.some((g) => g.lastCheckedAt)
        ? "Aucun jeu de la liste n'est en promo en ce moment."
        : "Aucune promo détectée. Le tracker n'a pas encore tourné — reviens dans quelques minutes.";

      await interaction.update({ content: `ℹ️ ${note}`, embeds: [], components: [buildBackRow()] });
      return;
    }

    const lines = onSale.map(
      (g) => `🏷 **[${g.title}](${getSteamUrl(g.steamAppId)})** — **${formatEur(g.lastKnownPriceEur!)}** (-${g.lastKnownDiscount ?? 0}%)`,
    );

    const embed = new EmbedBuilder()
      .setColor(STEAM_CONSTANTS.EMBED_COLOR_SALE)
      .setTitle(`🔥 Promos en cours (${onSale.length})`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Mis à jour toutes les 6h" });

    await interaction.update({ content: "", embeds: [embed], components: [buildBackRow()] });
    return;
  }
}

// ── Bouton Revenir ────────────────────────────────────────────────────────────

export async function handleSteamBack(interaction: ButtonInteraction): Promise<void> {
  await interaction.update(buildMainMenu());
}

// ── Modal — saisie du nom ─────────────────────────────────────────────────────

export async function handleSteamAddModal(interaction: ModalSubmitInteraction): Promise<void> {
  const query = interaction.fields.getTextInputValue(STEAM_INPUT_NAME_ID);

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
      .setCustomId(STEAM_ADD_SELECT_ID)
      .setPlaceholder("Sélectionne le jeu à ajouter…")
      .addOptions(options),
  );

  await interaction.editReply({ content: `🔍 Résultats pour **${query}** :`, components: [row] });
}

// ── StringSelectMenu — confirme l'ajout ──────────────────────────────────────

export async function handleSteamAddSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(steamAppId)) { await interaction.update({ content: "❌ Valeur invalide.", components: [] }); return; }

  await interaction.update({ content: "⏳ Récupération des infos Steam…", components: [] });

  const existing = await getGameByAppId(guildId, steamAppId);
  if (existing) { await interaction.editReply({ content: `ℹ️ **${existing.title}** est déjà dans la liste.` }); return; }

  const details = await getSteamAppDetails(steamAppId);
  const title = details?.name ?? `App ${steamAppId}`;
  const headerImage = details?.header_image ?? null;

  await insertGame({
    guildId, steamAppId, title, headerImage,
    addedBy: interaction.user.id,
    addedByName: interaction.user.displayName ?? interaction.user.username,
  });

  const priceStr = details?.is_free
    ? "Gratuit"
    : details?.price_overview?.final_formatted ?? "Prix inconnu";

  await interaction.editReply({ content: `✅ **${title}** ajouté à la liste. (${priceStr})` });

  logger.info("[steam] jeu ajouté", { guildId, title, steamAppId, userId: interaction.user.id });
}

// ── StringSelectMenu — comparaison de prix ────────────────────────────────────

export async function handleSteamPriceSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(steamAppId)) return;

  await interaction.update({ content: "⏳ Récupération des prix…", components: [buildBackRow()], embeds: [] });

  const game = await getGameByAppId(guildId, steamAppId);
  if (!game) { await interaction.editReply({ content: "❌ Jeu introuvable.", components: [buildBackRow()] }); return; }

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

  let itadFooter = "";
  if (env.ITAD_API_KEY) {
    const itadGame = await lookupITADGame(steamAppId, env.ITAD_API_KEY);
    if (itadGame) {
      const deals = await getITADDeals(itadGame.id, env.ITAD_API_KEY);
      const others = deals.filter((d) => d.shop.id !== "steam").sort((a, b) => a.price.amount - b.price.amount).slice(0, 5);

      if (others.length > 0) {
        lines.push("", "**Autres boutiques :**");
        for (const deal of others) {
          const saleStr = deal.cut > 0 ? ` (-${deal.cut}%)` : "";
          lines.push(`🏷 **[${deal.shop.name}](${deal.url})** — ${deal.price.amount.toFixed(2)} €${saleStr}`);
        }
        itadFooter = `\n\n[Voir toutes les offres sur ITAD](https://isthereanydeal.com/game/${itadGame.slug}/info/)`;
      }
    }
  } else {
    lines.push("\n*Comparaison multi-boutiques désactivée (ITAD_API_KEY non configuré)*");
  }

  const embed = new EmbedBuilder()
    .setColor(STEAM_CONSTANTS.EMBED_COLOR_PRICES)
    .setTitle(`💰 Prix — ${game.title}`)
    .setThumbnail(game.headerImage ?? null)
    .setDescription(lines.join("\n") + itadFooter);

  await interaction.editReply({ content: "", embeds: [embed], components: [buildBackRow()] });
}

// ── StringSelectMenu — suppression ───────────────────────────────────────────

export async function handleSteamRemoveSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(steamAppId)) return;

  const game = await getGameByAppId(guildId, steamAppId);
  if (!game) { await interaction.update({ content: "❌ Jeu introuvable.", components: [buildBackRow()], embeds: [] }); return; }

  await deleteGame(game.id);

  await interaction.update({
    content: `✅ **${game.title}** retiré de la liste.`,
    embeds: [],
    components: [buildBackRow()],
  });

  logger.info("[steam] jeu retiré", { guildId, title: game.title, steamAppId });
}
