import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import { dealsConfig, dealsGames } from "../../../core/db/schema.js";

// ── Jeux ───────────────────────────────────────────────────────────────────────

export async function getGames(guildId: string, channelId: string) {
  return db.select().from(dealsGames)
    .where(and(eq(dealsGames.guildId, guildId), eq(dealsGames.channelId, channelId)));
}

export async function getAllGames() {
  return db.select().from(dealsGames);
}

export async function getGameByAppId(guildId: string, channelId: string, steamAppId: number) {
  const rows = await db.select().from(dealsGames)
    .where(and(eq(dealsGames.guildId, guildId), eq(dealsGames.channelId, channelId), eq(dealsGames.steamAppId, steamAppId)));
  return rows[0] ?? null;
}

export async function insertGame(data: {
  guildId: string; channelId: string; steamAppId: number; title: string; headerImage: string | null;
  addedById: string; addedByName: string;
  lastKnownPriceEur?: number | null; lastKnownDiscount?: number; isOnSale?: number; lastCheckedAt?: string;
}) {
  await db.insert(dealsGames).values({ ...data, addedAt: new Date().toISOString(), isOnSale: data.isOnSale ?? 0 });
}

export async function removeGame(id: number) {
  await db.delete(dealsGames).where(eq(dealsGames.id, id));
}

export async function updateGamePrice(id: number, data: {
  lastKnownPriceEur: number | null; lastKnownDiscount: number; isOnSale: number; lastCheckedAt: string;
}) {
  await db.update(dealsGames).set(data).where(eq(dealsGames.id, id));
}

// ── Config ─────────────────────────────────────────────────────────────────────

export async function getConfig(guildId: string, channelId: string) {
  const rows = await db.select().from(dealsConfig)
    .where(and(eq(dealsConfig.guildId, guildId), eq(dealsConfig.channelId, channelId)));
  return rows[0] ?? null;
}

export async function getAllConfigs() {
  return db.select().from(dealsConfig);
}

export async function setNotifChannel(guildId: string, channelId: string, notifChannelId: string | null) {
  const existing = await getConfig(guildId, channelId);
  if (existing) {
    await db.update(dealsConfig).set({ notifChannelId })
      .where(and(eq(dealsConfig.guildId, guildId), eq(dealsConfig.channelId, channelId)));
  } else {
    await db.insert(dealsConfig).values({ guildId, channelId, notifChannelId });
  }
}
