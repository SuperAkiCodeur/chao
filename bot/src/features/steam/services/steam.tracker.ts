import { EmbedBuilder, type Client } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { STEAM_CONSTANTS } from "../domain/steam.constants.js";
import { formatEur, getSteamAppDetails, getSteamUrl } from "./steam.api.js";
import { getAllGames, getSteamConfig, updateGameTrackerData } from "./steam.repository.js";

async function checkPromos(client: Client): Promise<void> {
  logger.info("[steam.tracker] démarrage de la vérification des promos");

  const games = await getAllGames();
  if (games.length === 0) return;

  // Mise en cache des configs par guildId pour éviter les doublons DB
  const guildIds = [...new Set(games.map((g) => g.guildId))];
  const configs = new Map(
    await Promise.all(guildIds.map(async (id) => [id, await getSteamConfig(id)] as const)),
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
        const config = configs.get(game.guildId);
        if (!config?.notifChannelId) continue;

        const channel = await client.channels.fetch(config.notifChannelId).catch(() => null);
        if (!channel?.isSendable()) continue;

        const embed = new EmbedBuilder()
          .setColor(STEAM_CONSTANTS.EMBED_COLOR_SALE)
          .setTitle("🎮 Promo Steam !")
          .setDescription(
            `**[${game.title}](${getSteamUrl(game.steamAppId)})**\n\n` +
            `~~${formatEur(price.initial)}~~ → **${formatEur(price.final)}** (-${price.discount_percent}%)`,
          )
          .setThumbnail(game.headerImage ?? null)
          .setFooter({ text: "Offre disponible sur Steam • Tracker Chao" });

        const mention = config.notifRoleId ? `<@&${config.notifRoleId}> ` : "";
        await channel.send({ content: mention || undefined, embeds: [embed] });

        logger.info("[steam.tracker] notification envoyée", {
          guildId: game.guildId,
          title: game.title,
          discount: price.discount_percent,
        });
      }
    } catch (error) {
      logger.error("[steam.tracker] erreur sur le jeu", { gameId: game.id, title: game.title, error });
    }
  }

  logger.info("[steam.tracker] vérification terminée", { count: games.length });
}

export function startSteamTracker(client: Client): void {
  const run = () => {
    checkPromos(client).catch((error) => {
      logger.error("[steam.tracker] erreur non gérée", { error });
    });
  };

  // Premier check 30s après le démarrage du bot
  setTimeout(run, 30_000);
  // Puis toutes les 6h
  setInterval(run, STEAM_CONSTANTS.TRACKER_INTERVAL_MS);

  logger.info("[steam.tracker] démarré", { intervalHours: 6 });
}
