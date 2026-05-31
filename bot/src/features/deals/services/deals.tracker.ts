import { EmbedBuilder, type Client } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { DEALS_CONSTANTS } from "../domain/deals.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl } from "./deals.api.js";
import { getAllConfigs, getAllGames, updateGamePrice } from "./deals.repository.js";

async function checkPromos(client: Client): Promise<void> {
  logger.info("[deals.tracker] démarrage de la vérification des promos");

  const games = await getAllGames();
  if (games.length === 0) return;

  // Cache des configs (guildId:channelId → notifChannelId)
  const configs = await getAllConfigs();
  const configMap = new Map(configs.map((c) => [`${c.guildId}:${c.channelId}`, c.notifChannelId]));

  for (const game of games) {
    try {
      const details = await getSteamAppDetails(game.steamAppId);
      if (!details) continue;

      const price       = details.price_overview;
      const wasOnSale   = game.isOnSale === 1;
      const isNowOnSale = !details.is_free && price ? price.discount_percent > 0 : false;

      await updateGamePrice(game.id, {
        lastKnownPriceEur: price?.final ?? null,
        lastKnownDiscount: price?.discount_percent ?? 0,
        isOnSale: isNowOnSale ? 1 : 0,
        lastCheckedAt: new Date().toISOString(),
      });

      if (!wasOnSale && isNowOnSale && price) {
        const notifChannelId = configMap.get(`${game.guildId}:${game.channelId}`);
        if (!notifChannelId) continue;

        const channel = await client.channels.fetch(notifChannelId).catch(() => null);
        if (!channel?.isSendable()) continue;

        const embed = new EmbedBuilder()
          .setColor(DEALS_CONSTANTS.EMBED_COLOR_SALE)
          .setTitle("🔥 Nouvelle promo !")
          .setDescription(
            `**[${game.title}](${getSteamUrl(game.steamAppId)})**\n\n` +
            `~~${formatEur(price.initial)}~~ → **${formatEur(price.final)}** (-${price.discount_percent}%)`,
          )
          .setThumbnail(game.headerImage ?? null)
          .setFooter({ text: "Tracker Chao • Deals" });

        await channel.send({ embeds: [embed] });

        logger.info("[deals.tracker] notification envoyée", {
          title: game.title,
          discount: price.discount_percent,
          notifChannelId,
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
