import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import {
  steamChannelPermissions,
  steamConfig,
  steamGames,
} from "../../../core/db/schema.js";

// ── Jeux ──────────────────────────────────────────────────────────────────────

export async function getGamesForGuild(guildId: string) {
  return db.select().from(steamGames).where(eq(steamGames.guildId, guildId));
}

export async function getAllGames() {
  return db.select().from(steamGames);
}

export async function getGameByAppId(guildId: string, steamAppId: number) {
  const rows = await db
    .select()
    .from(steamGames)
    .where(and(eq(steamGames.guildId, guildId), eq(steamGames.steamAppId, steamAppId)));
  return rows[0] ?? null;
}

export async function insertGame(data: {
  guildId: string;
  steamAppId: number;
  title: string;
  headerImage: string | null;
  addedBy: string;
  addedByName: string;
}) {
  await db.insert(steamGames).values({
    ...data,
    addedAt: new Date().toISOString(),
    isOnSale: 0,
  });
}

export async function deleteGame(id: number) {
  await db.delete(steamGames).where(eq(steamGames.id, id));
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
  await db.update(steamGames).set(data).where(eq(steamGames.id, id));
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function getSteamConfig(guildId: string) {
  const rows = await db
    .select()
    .from(steamConfig)
    .where(eq(steamConfig.guildId, guildId));
  return rows[0] ?? null;
}

export async function upsertSteamConfig(
  guildId: string,
  data: { notifChannelId: string | null; notifRoleId: string | null },
) {
  const existing = await getSteamConfig(guildId);
  if (existing) {
    await db.update(steamConfig).set(data).where(eq(steamConfig.guildId, guildId));
  } else {
    await db.insert(steamConfig).values({ guildId, ...data });
  }
}

// ── Permissions salon ─────────────────────────────────────────────────────────

export async function getChannelPermissions(guildId: string) {
  return db
    .select()
    .from(steamChannelPermissions)
    .where(eq(steamChannelPermissions.guildId, guildId));
}

export async function insertChannelPermission(guildId: string, channelId: string, roleId: string) {
  await db.insert(steamChannelPermissions).values({ guildId, channelId, roleId });
}

export async function deleteChannelPermission(id: number) {
  await db.delete(steamChannelPermissions).where(eq(steamChannelPermissions.id, id));
}
