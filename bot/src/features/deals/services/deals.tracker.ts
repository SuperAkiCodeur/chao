import { EmbedBuilder, type Client } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { DEALS_CONSTANTS } from "../domain/deals.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl } from "./deals.api.js";
import { getAllGames, getDealsChannelConfig, updateGameTrackerData } from "./deals.repository.js";

async function checkPromos(client: Client): Promise<void> {
  logger.info("[deals.tracker] démarrage de la vérification des promos");

  const games = await getAllGames();
  if (games.length === 0) return;

  // Mise en cache des configs par (guildId:channelId) — une liste = un salon
  const channelKeys = [...new Set(games.map((g) => `${g.guildId}:${g.channelId}`))];
  const configs = new Map(
    await Promise.all(
      channelKeys.map(async (key) => {
        const sep = key.indexOf(":");
        const guildId = key.slice(0, sep);
        const channelId = key.slice(sep + 1);
        return [key, await getDealsChannelConfig(guildId, channelId)] as const;
      }),
    ),
  );

  for (const game of games) {
    try {
      const details = await getSteamAppDetails(game.steamAppId);
      if (!details) continue;

      const price = details.price_overview;
      const wasOnSale = game.isOnSale === 1;
      const isNowOnSale = !details.is_free && price ? price.discount_percent > 0 : false;

      await updateGameTrackerData(game.id, {
        lastKnownPriceEur: price?.final ?? null,
        lastKnownDiscount: price?.discount_percent ?? 0,
        isOnSale: isNowOnSale ? 1 : 0,
        lastCheckedAt: new Date().toISOString(),
      });

      // Notification uniquement si le jeu vient de passer en promo
      if (!wasOnSale && isNowOnSale && price) {
        const config = configs.get(`${game.guildId}:${game.channelId}`);
        if (!config?.notifChannelId) continue;

        const channel = await client.channels.fetch(config.notifChannelId).catch(() => null);
        if (!channel?.isSendable()) continue;

        const embed = new EmbedBuilder()
          .setColor(DEALS_CONSTANTS.EMBED_COLOR_SALE)
          .setTitle("🎮 Promo Steam !")
          .setDescription(
            `**[${game.title}](${getSteamUrl(game.steamAppId)})**\n\n` +
            `~~${formatEur(price.initial)}~~ → **${formatEur(price.final)}** (-${price.discount_percent}%)`,
          )
          .setThumbnail(game.headerImage ?? null)
          .setFooter({ text: "Offre disponible sur Steam • Tracker Chao" });

        const mention = config.notifRoleId ? `<@&${config.notifRoleId}> ` : "";
        await channel.send({ content: mention || undefined, embeds: [embed] });

        logger.info("[deals.tracker] notification envoyée", {
          guildId: game.guildId,
          title: game.title,
          discount: price.discount_percent,
        });
      }
    } catch (error) {
      logger.error("[deals.tracker] erreur sur le jeu", { gameId: game.id, title: game.title, error });
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

  // Premier check 30s après le démarrage du bot
  setTimeout(run, 30_000);
  // Puis toutes les 6h
  setInterval(run, DEALS_CONSTANTS.TRACKER_INTERVAL_MS);

  logger.info("[deals.tracker] démarré", { intervalHours: 6 });
}
