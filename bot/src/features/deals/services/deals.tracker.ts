import { EmbedBuilder, type Client } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { DEALS_CONSTANTS } from "../domain/deals.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl } from "./deals.api.js";
import { getAllGames, getListById, getMembersForList, updateGamePrice } from "./deals.repository.js";

async function checkPromos(client: Client): Promise<void> {
  logger.info("[deals.tracker] démarrage de la vérification des promos");

  const games = await getAllGames();
  if (games.length === 0) return;

  // Cache des listes pour éviter les requêtes répétées
  const listCache = new Map<number, Awaited<ReturnType<typeof getListById>>>();

  for (const game of games) {
    try {
      const details = await getSteamAppDetails(game.steamAppId);
      if (!details) continue;

      const price = details.price_overview;
      const wasOnSale = game.isOnSale === 1;
      const isNowOnSale = !details.is_free && price ? price.discount_percent > 0 : false;

      await updateGamePrice(game.id, {
        lastKnownPriceEur: price?.final ?? null,
        lastKnownDiscount: price?.discount_percent ?? 0,
        isOnSale: isNowOnSale ? 1 : 0,
        lastCheckedAt: new Date().toISOString(),
      });

      // Notification uniquement si le jeu vient de passer en promo
      if (!wasOnSale && isNowOnSale && price) {
        if (!listCache.has(game.listId)) {
          listCache.set(game.listId, await getListById(game.listId));
        }
        const list = listCache.get(game.listId);
        if (!list?.notifChannelId) continue;

        const channel = await client.channels.fetch(list.notifChannelId).catch(() => null);
        if (!channel?.isSendable()) continue;

        // Mention du propriétaire + membres
        const members = await getMembersForList(game.listId);
        const mentions = [list.ownerId, ...members.map((m) => m.userId)]
          .map((id) => `<@${id}>`).join(" ");

        const embed = new EmbedBuilder()
          .setColor(DEALS_CONSTANTS.EMBED_COLOR_SALE)
          .setTitle("🔥 Nouvelle promo !")
          .setDescription(
            `**[${game.title}](${getSteamUrl(game.steamAppId)})**\n\n` +
            `~~${formatEur(price.initial)}~~ → **${formatEur(price.final)}** (-${price.discount_percent}%)\n\n` +
            `📋 Liste : **${list.name}**`,
          )
          .setThumbnail(game.headerImage ?? null)
          .setFooter({ text: "Tracker Chao • Deals" });

        await channel.send({ content: mentions, embeds: [embed] });

        logger.info("[deals.tracker] notification envoyée", {
          listId: game.listId,
          title: game.title,
          discount: price.discount_percent,
        });
      }
    } catch (error) {
      logger.error("[deals.tracker] erreur", { gameId: game.id, title: game.title, error });
    }
  }

  logger.info("[deals.tracker] vérification terminée", { count: games.length });
}

export function startDealsTracker(client: Client): void {
  const run = () => {
    checkPromos(client).catch((error) => {
      logger.error("[deals.tracker] erreur non gérée", { error });
    });
  };

  setTimeout(run, 30_000);
  setInterval(run, DEALS_CONSTANTS.TRACKER_INTERVAL_MS);

  logger.info("[deals.tracker] démarré", { intervalHours: 6 });
}
