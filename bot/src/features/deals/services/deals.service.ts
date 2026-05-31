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
  UserSelectMenuBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type UserSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { env } from "../../../core/config/env.js";
import {
  DEALS_ACTION_PREFIX,
  DEALS_ADD_RESULT_PFX,
  DEALS_BACK_LIST_PFX,
  DEALS_BACK_MAIN_BTN_ID,
  DEALS_CONSTANTS,
  DEALS_CREATE_MODAL_ID,
  DEALS_CREATE_NAME_INPUT,
  DEALS_DELETE_PFX,
  DEALS_LISTS_SELECT_ID,
  DEALS_MAIN_MENU_ID,
  DEALS_PRICE_PFX,
  DEALS_REMOVE_PFX,
  DEALS_SEARCH_MODAL_PFX,
  DEALS_SEARCH_NAME_INPUT,
  DEALS_SHARE_PFX,
} from "../domain/deals.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl, searchSteamGames } from "./deals.api.js";
import { getITADDeals, lookupITADGame } from "./itad.api.js";
import {
  addMember,
  canAccess,
  createList,
  deleteGame,
  deleteList,
  getGameByAppId,
  getGamesForList,
  getListById,
  getListsForUser,
  getMembersForList,
  insertGame,
} from "./deals.repository.js";

// ── Builders ──────────────────────────────────────────────────────────────────

function btnBackMain() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(DEALS_BACK_MAIN_BTN_ID).setLabel("↩ Mes listes").setStyle(ButtonStyle.Secondary),
  );
}

function btnBackList(listId: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`${DEALS_BACK_LIST_PFX}${listId}`).setLabel("↩ Retour à la liste").setStyle(ButtonStyle.Secondary),
  );
}

function buildMainMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId(DEALS_MAIN_MENU_ID)
    .setPlaceholder("Que veux-tu faire ?")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("📋 Mes listes").setValue("mes_listes")
        .setDescription("Voir et gérer tes listes de jeux"),
      new StringSelectMenuOptionBuilder().setLabel("➕ Créer une liste").setValue("creer")
        .setDescription("Créer une nouvelle liste de jeux à suivre"),
    );
  return {
    content: "🎮 **Deals** — Suivi de prix et alertes promos Steam",
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  };
}

function buildListActionMenu(list: { id: number; name: string; ownerId: string }, isOwner: boolean) {
  const options = [
    new StringSelectMenuOptionBuilder().setLabel("👁 Voir les jeux").setValue("voir")
      .setDescription("Afficher tous les jeux et leurs prix actuels"),
    new StringSelectMenuOptionBuilder().setLabel("🔍 Ajouter un jeu").setValue("ajouter")
      .setDescription("Rechercher et ajouter un jeu Steam"),
    new StringSelectMenuOptionBuilder().setLabel("🗑 Retirer un jeu").setValue("retirer")
      .setDescription("Supprimer un jeu de la liste"),
    new StringSelectMenuOptionBuilder().setLabel("🔥 Promos en cours").setValue("promos")
      .setDescription("Voir les jeux actuellement en promotion"),
    new StringSelectMenuOptionBuilder().setLabel("💰 Comparer les prix").setValue("prix")
      .setDescription("Comparer prix Steam et autres revendeurs"),
  ];
  if (isOwner) {
    options.push(
      new StringSelectMenuOptionBuilder().setLabel("👥 Partager").setValue("partager")
        .setDescription("Partager cette liste avec d'autres utilisateurs"),
      new StringSelectMenuOptionBuilder().setLabel("❌ Supprimer la liste").setValue("supprimer")
        .setDescription("Supprimer définitivement cette liste"),
    );
  }
  const select = new StringSelectMenuBuilder()
    .setCustomId(`${DEALS_ACTION_PREFIX}${list.id}`)
    .setPlaceholder("Choisir une action…")
    .addOptions(options);
  return {
    content: `📋 **${list.name}**`,
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      btnBackMain(),
    ],
  };
}

// ── /deals ────────────────────────────────────────────────────────────────────

export async function handleDealsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ Commande disponible uniquement dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ ...buildMainMenu(), flags: MessageFlags.Ephemeral });
}

// ── Menu principal ────────────────────────────────────────────────────────────

export async function handleDealsMainMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const value = interaction.values[0];

  if (value === "creer") {
    const modal = new ModalBuilder().setCustomId(DEALS_CREATE_MODAL_ID).setTitle("Créer une liste");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(DEALS_CREATE_NAME_INPUT)
          .setLabel("Nom de la liste")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ma liste RPG, Wishlist été…")
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
    await interaction.showModal(modal);
    return;
  }

  if (value === "mes_listes") {
    const lists = await getListsForUser(interaction.guildId!, interaction.user.id);
    if (lists.length === 0) {
      await interaction.update({
        content: "📋 Tu n'as aucune liste pour l'instant. Crée-en une !",
        components: [btnBackMain()],
      });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(DEALS_LISTS_SELECT_ID)
      .setPlaceholder("Choisir une liste…")
      .addOptions(
        lists.slice(0, 25).map((l) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(l.name)
            .setValue(String(l.id))
            .setDescription(`par ${l.ownerName}${l.ownerId === interaction.user.id ? " (toi)" : ""}`),
        ),
      );
    await interaction.update({
      content: "📋 **Mes listes** — Choisis une liste :",
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), btnBackMain()],
    });
  }
}

// ── Sélection d'une liste ─────────────────────────────────────────────────────

export async function handleDealsListSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(listId)) { await interaction.update({ content: "❌ Valeur invalide.", components: [] }); return; }

  const list = await getListById(listId);
  if (!list) { await interaction.update({ content: "❌ Liste introuvable.", components: [btnBackMain()] }); return; }

  const members = await getMembersForList(listId);
  if (!canAccess(list, members, interaction.user.id)) {
    await interaction.update({ content: "❌ Tu n'as pas accès à cette liste.", components: [btnBackMain()] });
    return;
  }

  const isOwner = list.ownerId === interaction.user.id;
  const games = await getGamesForList(listId);
  const onSale = games.filter((g) => g.isOnSale === 1).length;
  const memberNames = members.map((m) => m.userName).join(", ");

  let desc = `**${games.length}** jeu${games.length !== 1 ? "x" : ""} tracké${games.length !== 1 ? "s" : ""}`;
  if (onSale > 0) desc += ` · 🔥 **${onSale} en promo**`;
  if (members.length > 0) desc += `\n👥 Partagée avec : ${memberNames}`;

  await interaction.update({ content: `📋 **${list.name}**\n${desc}`, ...buildListActionMenu(list, isOwner) });
}

// ── Menu d'actions d'une liste ────────────────────────────────────────────────

export async function handleDealsActionMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_ACTION_PREFIX.length), 10);
  const list = await getListById(listId);
  if (!list) { await interaction.update({ content: "❌ Liste introuvable.", components: [] }); return; }

  const members = await getMembersForList(listId);
  if (!canAccess(list, members, interaction.user.id)) {
    await interaction.update({ content: "❌ Accès refusé.", components: [] });
    return;
  }

  const isOwner = list.ownerId === interaction.user.id;
  const value = interaction.values[0];

  // ── Voir ──────────────────────────────────────────────────────────────────
  if (value === "voir") {
    const games = await getGamesForList(listId);
    if (games.length === 0) {
      await interaction.update({ content: `📋 **${list.name}** — Aucun jeu pour l'instant.`, components: [btnBackList(listId)] });
      return;
    }
    const lines = games.map((g) => {
      const priceStr = g.lastKnownPriceEur !== null
        ? g.isOnSale === 1
          ? `~~${formatEur(Math.round(g.lastKnownPriceEur / (1 - (g.lastKnownDiscount ?? 0) / 100)))}~~ **${formatEur(g.lastKnownPriceEur)}** (-${g.lastKnownDiscount}%)`
          : formatEur(g.lastKnownPriceEur)
        : "Prix inconnu";
      return `${g.isOnSale ? "🔴" : "⚪"} **[${g.title}](${getSteamUrl(g.steamAppId)})** — ${priceStr}`;
    });
    const embed = new EmbedBuilder()
      .setColor(DEALS_CONSTANTS.EMBED_COLOR)
      .setTitle(`📋 ${list.name} (${games.length})`)
      .setDescription(lines.join("\n").slice(0, 4000));
    await interaction.update({ content: "", embeds: [embed], components: [btnBackList(listId)] });
    return;
  }

  // ── Ajouter ───────────────────────────────────────────────────────────────
  if (value === "ajouter") {
    const modal = new ModalBuilder()
      .setCustomId(`${DEALS_SEARCH_MODAL_PFX}${listId}`)
      .setTitle("Ajouter un jeu");
    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(DEALS_SEARCH_NAME_INPUT)
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

  // ── Retirer ───────────────────────────────────────────────────────────────
  if (value === "retirer") {
    const games = await getGamesForList(listId);
    if (games.length === 0) {
      await interaction.update({ content: `📋 **${list.name}** — Aucun jeu à retirer.`, components: [btnBackList(listId)] });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${DEALS_REMOVE_PFX}${listId}`)
      .setPlaceholder("Choisir un jeu à retirer…")
      .addOptions(games.slice(0, 25).map((g) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(g.title.slice(0, 100))
          .setValue(String(g.steamAppId))
          .setDescription(g.isOnSale === 1 ? "🔥 En promo" : "Prix standard"),
      ));
    await interaction.update({
      content: `🗑 **Retirer un jeu** de **${list.name}** — Choisis un jeu :`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), btnBackList(listId)],
    });
    return;
  }

  // ── Promos ────────────────────────────────────────────────────────────────
  if (value === "promos") {
    const games = await getGamesForList(listId);
    const onSale = games.filter((g) => g.isOnSale === 1);
    if (onSale.length === 0) {
      const note = games.some((g) => g.lastCheckedAt)
        ? "Aucun jeu de cette liste n'est en promo en ce moment."
        : "Aucune promo détectée — le tracker n'a pas encore tourné.";
      await interaction.update({ content: `ℹ️ ${note}`, components: [btnBackList(listId)] });
      return;
    }
    const lines = onSale.map((g) =>
      `🏷 **[${g.title}](${getSteamUrl(g.steamAppId)})** — **${formatEur(g.lastKnownPriceEur!)}** (-${g.lastKnownDiscount ?? 0}%)`,
    );
    const embed = new EmbedBuilder()
      .setColor(DEALS_CONSTANTS.EMBED_COLOR_SALE)
      .setTitle(`🔥 Promos — ${list.name} (${onSale.length})`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Mis à jour toutes les 6h" });
    await interaction.update({ content: "", embeds: [embed], components: [btnBackList(listId)] });
    return;
  }

  // ── Prix ──────────────────────────────────────────────────────────────────
  if (value === "prix") {
    const games = await getGamesForList(listId);
    if (games.length === 0) {
      await interaction.update({ content: `ℹ️ Aucun jeu dans **${list.name}**.`, components: [btnBackList(listId)] });
      return;
    }
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${DEALS_PRICE_PFX}${listId}`)
      .setPlaceholder("Choisir un jeu…")
      .addOptions(games.slice(0, 25).map((g) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(g.title.slice(0, 100))
          .setValue(String(g.steamAppId)),
      ));
    await interaction.update({
      content: `💰 **Comparer les prix** — ${list.name} — Choisis un jeu :`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select), btnBackList(listId)],
    });
    return;
  }

  // ── Partager (owner only) ─────────────────────────────────────────────────
  if (value === "partager") {
    if (!isOwner) {
      await interaction.update({ content: "❌ Seul le propriétaire peut partager la liste.", components: [btnBackList(listId)] });
      return;
    }
    const userSelect = new UserSelectMenuBuilder()
      .setCustomId(`${DEALS_SHARE_PFX}${listId}`)
      .setPlaceholder("Sélectionne des utilisateurs…")
      .setMinValues(1)
      .setMaxValues(10);
    await interaction.update({
      content: `👥 **Partager "${list.name}"** — Sélectionne les utilisateurs à ajouter :`,
      components: [
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
        btnBackList(listId),
      ],
    });
    return;
  }

  // ── Supprimer (owner only) ────────────────────────────────────────────────
  if (value === "supprimer") {
    if (!isOwner) {
      await interaction.update({ content: "❌ Seul le propriétaire peut supprimer la liste.", components: [btnBackList(listId)] });
      return;
    }
    const games = await getGamesForList(listId);
    await interaction.update({
      content: `⚠️ Supprimer **${list.name}** (${games.length} jeu${games.length !== 1 ? "x" : ""}) ? Cette action est irréversible.`,
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`${DEALS_DELETE_PFX}${listId}`).setLabel("Supprimer").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`${DEALS_BACK_LIST_PFX}${listId}`).setLabel("Annuler").setStyle(ButtonStyle.Secondary),
        ),
      ],
    });
    return;
  }
}

// ── Boutons retour ────────────────────────────────────────────────────────────

export async function handleDealsBackMain(interaction: ButtonInteraction): Promise<void> {
  await interaction.update({ ...buildMainMenu(), embeds: [] });
}

export async function handleDealsBackList(interaction: ButtonInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_BACK_LIST_PFX.length), 10);
  const list = await getListById(listId);
  if (!list) { await interaction.update({ content: "❌ Liste introuvable.", components: [], embeds: [] }); return; }
  const isOwner = list.ownerId === interaction.user.id;
  await interaction.update({ embeds: [], ...buildListActionMenu(list, isOwner) });
}

// ── Créer une liste (modal) ───────────────────────────────────────────────────

export async function handleDealsCreateModal(interaction: ModalSubmitInteraction): Promise<void> {
  const name = interaction.fields.getTextInputValue(DEALS_CREATE_NAME_INPUT).trim();
  if (!name) { await interaction.reply({ content: "❌ Nom invalide.", flags: MessageFlags.Ephemeral }); return; }
  if (!interaction.guildId) return;

  const list = await createList({
    guildId: interaction.guildId,
    ownerId: interaction.user.id,
    ownerName: interaction.user.displayName ?? interaction.user.username,
    name,
  });

  await interaction.reply({
    content: `✅ Liste **${list.name}** créée !`,
    ...buildListActionMenu(list, true),
    flags: MessageFlags.Ephemeral,
  });
  logger.info("[deals] liste créée", { guildId: interaction.guildId, userId: interaction.user.id, name });
}

// ── Recherche de jeu (modal) ──────────────────────────────────────────────────

export async function handleDealsSearchModal(interaction: ModalSubmitInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_SEARCH_MODAL_PFX.length), 10);
  const query = interaction.fields.getTextInputValue(DEALS_SEARCH_NAME_INPUT).trim();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const list = await getListById(listId);
  if (!list) { await interaction.editReply("❌ Liste introuvable."); return; }

  try {
    const results = await searchSteamGames(query);
    if (results.length === 0) {
      await interaction.editReply("❌ Aucun résultat pour cette recherche. Essaie un autre terme.");
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
      .setCustomId(`${DEALS_ADD_RESULT_PFX}${listId}`)
      .setPlaceholder("Choisir le jeu à ajouter…")
      .addOptions(options);

    await interaction.editReply({
      content: `🔍 Résultats pour **${query}** — ajouter à **${list.name}** :`,
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
    });
  } catch (err) {
    logger.error("[deals] handleDealsSearchModal", { err });
    await interaction.editReply("❌ Erreur lors de la recherche. Réessaie.").catch(() => null);
  }
}

// ── Ajouter un jeu (select résultat) ─────────────────────────────────────────

export async function handleDealsAddResult(interaction: StringSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_ADD_RESULT_PFX.length), 10);
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);
  if (isNaN(listId) || isNaN(steamAppId)) { await interaction.update({ content: "❌ Valeur invalide.", components: [] }); return; }

  await interaction.update({ content: "⏳ Récupération des infos Steam…", components: [] });

  const list = await getListById(listId);
  if (!list) { await interaction.editReply({ content: "❌ Liste introuvable.", components: [] }); return; }

  const existing = await getGameByAppId(listId, steamAppId);
  if (existing) {
    await interaction.editReply({ content: `ℹ️ **${existing.title}** est déjà dans **${list.name}**.`, components: [btnBackList(listId)] });
    return;
  }

  const details = await getSteamAppDetails(steamAppId);
  const title = details?.name ?? `App ${steamAppId}`;
  const headerImage = details?.header_image ?? null;
  const price = details?.price_overview;
  const lastKnownPriceEur = details?.is_free ? 0 : (price?.final ?? null);
  const lastKnownDiscount = price?.discount_percent ?? 0;
  const isOnSale = lastKnownDiscount > 0 ? 1 : 0;

  await insertGame({
    listId, steamAppId, title, headerImage,
    addedById: interaction.user.id,
    addedByName: interaction.user.displayName ?? interaction.user.username,
    lastKnownPriceEur, lastKnownDiscount, isOnSale,
    lastCheckedAt: new Date().toISOString(),
  });

  const priceStr = details?.is_free ? "Gratuit" : price?.final_formatted ?? "Prix inconnu";
  await interaction.editReply({
    content: `✅ **${title}** ajouté à **${list.name}**. (${priceStr})`,
    components: [btnBackList(listId)],
  });
  logger.info("[deals] jeu ajouté", { listId, title, steamAppId, userId: interaction.user.id });
}

// ── Retirer un jeu ────────────────────────────────────────────────────────────

export async function handleDealsRemoveSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_REMOVE_PFX.length), 10);
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);

  const game = await getGameByAppId(listId, steamAppId);
  if (!game) { await interaction.update({ content: "❌ Jeu introuvable.", components: [] }); return; }

  await deleteGame(game.id);

  const list = await getListById(listId);
  await interaction.update({
    content: `✅ **${game.title}** retiré de **${list?.name ?? "la liste"}**.`,
    components: [btnBackList(listId)],
  });
  logger.info("[deals] jeu retiré", { listId, title: game.title, steamAppId });
}

// ── Comparer les prix ─────────────────────────────────────────────────────────

export async function handleDealsPriceSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_PRICE_PFX.length), 10);
  const steamAppId = parseInt(interaction.values[0] ?? "", 10);

  await interaction.update({ content: "⏳ Récupération des prix…", components: [btnBackList(listId)], embeds: [] });

  const game = await getGameByAppId(listId, steamAppId);
  if (!game) { await interaction.editReply({ content: "❌ Jeu introuvable.", components: [btnBackList(listId)] }); return; }

  const details = await getSteamAppDetails(steamAppId);
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

  let itadFooter = "";
  if (env.ITAD_API_KEY) {
    const itadGame = await lookupITADGame(steamAppId, env.ITAD_API_KEY);
    if (itadGame) {
      const deals = await getITADDeals(itadGame.id, env.ITAD_API_KEY);
      const others = deals.filter((d) => d.shop.id !== "steam").sort((a, b) => a.price.amount - b.price.amount).slice(0, 5);
      if (others.length > 0) {
        lines.push("", "**Autres boutiques :**");
        for (const deal of others) {
          lines.push(`🏷 **[${deal.shop.name}](${deal.url})** — ${deal.price.amount.toFixed(2)} €${deal.cut > 0 ? ` (-${deal.cut}%)` : ""}`);
        }
        itadFooter = `\n\n[Voir toutes les offres sur ITAD](https://isthereanydeal.com/game/${itadGame.slug}/info/)`;
      }
    }
  }

  const embed = new EmbedBuilder()
    .setColor(DEALS_CONSTANTS.EMBED_COLOR_PRICES)
    .setTitle(`💰 Prix — ${game.title}`)
    .setThumbnail(game.headerImage ?? null)
    .setDescription(lines.join("\n") + itadFooter);

  await interaction.editReply({ content: "", embeds: [embed], components: [btnBackList(listId)] });
}

// ── Partager (UserSelect) ─────────────────────────────────────────────────────

export async function handleDealsShareSelect(interaction: UserSelectMenuInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_SHARE_PFX.length), 10);
  const list = await getListById(listId);
  if (!list) { await interaction.update({ content: "❌ Liste introuvable.", components: [] }); return; }

  if (list.ownerId !== interaction.user.id) {
    await interaction.update({ content: "❌ Seul le propriétaire peut partager la liste.", components: [btnBackList(listId)] });
    return;
  }

  const added: string[] = [];
  for (const [userId, user] of interaction.users) {
    if (userId === interaction.user.id) continue; // skip self
    await addMember(listId, userId, user.displayName ?? user.username);
    added.push(user.displayName ?? user.username);
  }

  await interaction.update({
    content: added.length > 0
      ? `✅ **${list.name}** partagée avec : ${added.join(", ")}`
      : "ℹ️ Aucun utilisateur ajouté.",
    components: [btnBackList(listId)],
  });
  logger.info("[deals] liste partagée", { listId, added });
}

// ── Supprimer (confirmation) ──────────────────────────────────────────────────

export async function handleDealsDeleteConfirm(interaction: ButtonInteraction): Promise<void> {
  const listId = parseInt(interaction.customId.slice(DEALS_DELETE_PFX.length), 10);
  const list = await getListById(listId);
  if (!list) { await interaction.update({ content: "❌ Liste introuvable.", components: [] }); return; }

  if (list.ownerId !== interaction.user.id) {
    await interaction.update({ content: "❌ Accès refusé.", components: [] });
    return;
  }

  await deleteList(listId);
  await interaction.update({ content: `✅ Liste **${list.name}** supprimée.`, components: [], embeds: [] });
  logger.info("[deals] liste supprimée", { listId, name: list.name, userId: interaction.user.id });
}
