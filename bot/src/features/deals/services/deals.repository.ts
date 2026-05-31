import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import {
  dealsChannelPermissions,
  dealsConfig,
  dealsGames,
} from "../../../core/db/schema.js";

// ── Jeux ──────────────────────────────────────────────────────────────────────

export async function getGamesForChannel(guildId: string, channelId: string) {
  return db
    .select()
    .from(dealsGames)
    .where(and(eq(dealsGames.guildId, guildId), eq(dealsGames.channelId, channelId)));
}

export async function getAllGames() {
  return db.select().from(dealsGames);
}

export async function getGameByAppId(guildId: string, channelId: string, steamAppId: number) {
  const rows = await db
    .select()
    .from(dealsGames)
    .where(
      and(
        eq(dealsGames.guildId, guildId),
        eq(dealsGames.channelId, channelId),
        eq(dealsGames.steamAppId, steamAppId),
      ),
    );
  return rows[0] ?? null;
}

export async function insertGame(data: {
  guildId: string;
  channelId: string;
  steamAppId: number;
  title: string;
  headerImage: string | null;
  addedBy: string;
  addedByName: string;
  lastKnownPriceEur?: number | null;
  lastKnownDiscount?: number;
  isOnSale?: number;
  lastCheckedAt?: string;
}) {
  await db.insert(dealsGames).values({
    ...data,
    addedAt: new Date().toISOString(),
    isOnSale: data.isOnSale ?? 0,
  });
}

export async function deleteGame(id: number) {
  await db.delete(dealsGames).where(eq(dealsGames.id, id));
}

export async function updateGameTrackerData(
  id: number,
  data: {
    lastKnownPriceEur: number | null;
    lastKnownDiscount: number;
    isOnSale: number;
    lastCheckedAt: string;
  },
) {
  await db.update(dealsGames).set(data).where(eq(dealsGames.id, id));
}

// ── Config (par salon) ────────────────────────────────────────────────────────

export async function getDealsChannelConfig(guildId: string, channelId: string) {
  const rows = await db
    .select()
    .from(dealsConfig)
    .where(and(eq(dealsConfig.guildId, guildId), eq(dealsConfig.channelId, channelId)));
  return rows[0] ?? null;
}

export async function upsertDealsChannelConfig(
  guildId: string,
  channelId: string,
  data: { notifChannelId: string | null; notifRoleId: string | null },
) {
  const existing = await getDealsChannelConfig(guildId, channelId);
  if (existing) {
    await db
      .update(dealsConfig)
      .set(data)
      .where(and(eq(dealsConfig.guildId, guildId), eq(dealsConfig.channelId, channelId)));
  } else {
    await db.insert(dealsConfig).values({ guildId, channelId, ...data });
  }
}

// ── Permissions salon ─────────────────────────────────────────────────────────

export async function getChannelPermissions(guildId: string) {
  return db
    .select()
    .from(dealsChannelPermissions)
    .where(eq(dealsChannelPermissions.guildId, guildId));
}

export async function insertChannelPermission(guildId: string, channelId: string, roleId: string) {
  await db.insert(dealsChannelPermissions).values({ guildId, channelId, roleId });
}

export async function deleteChannelPermission(id: number) {
  await db.delete(dealsChannelPermissions).where(eq(dealsChannelPermissions.id, id));
}
