import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import { dealsGames, dealsListMembers, dealsLists } from "../../../core/db/schema.js";

// ── Listes ─────────────────────────────────────────────────────────────────────

export async function getListById(id: number) {
  const rows = await db.select().from(dealsLists).where(eq(dealsLists.id, id));
  return rows[0] ?? null;
}

export async function getListsForUser(guildId: string, userId: string) {
  // Listes dont l'utilisateur est propriétaire
  const owned = await db.select().from(dealsLists)
    .where(and(eq(dealsLists.guildId, guildId), eq(dealsLists.ownerId, userId)));

  // Listes dont l'utilisateur est membre
  const memberRows = await db.select().from(dealsListMembers).where(eq(dealsListMembers.userId, userId));
  const sharedIds = memberRows.map((r) => r.listId).filter((id) => !owned.some((l) => l.id === id));

  const shared = sharedIds.length > 0
    ? await db.select().from(dealsLists)
        .where(and(eq(dealsLists.guildId, guildId), inArray(dealsLists.id, sharedIds)))
    : [];

  return [...owned, ...shared];
}

export async function getAllListsForGuild(guildId: string) {
  return db.select().from(dealsLists).where(eq(dealsLists.guildId, guildId));
}

export async function createList(data: {
  guildId: string; ownerId: string; ownerName: string; name: string;
}) {
  const rows = await db.insert(dealsLists).values({
    ...data,
    createdAt: new Date().toISOString(),
  }).returning();
  return rows[0]!;
}

export async function deleteList(id: number) {
  await db.delete(dealsListMembers).where(eq(dealsListMembers.listId, id));
  await db.delete(dealsGames).where(eq(dealsGames.listId, id));
  await db.delete(dealsLists).where(eq(dealsLists.id, id));
}

export async function setListNotifChannel(listId: number, channelId: string | null) {
  await db.update(dealsLists).set({ notifChannelId: channelId }).where(eq(dealsLists.id, listId));
}

// ── Membres ────────────────────────────────────────────────────────────────────

export async function getMembersForList(listId: number) {
  return db.select().from(dealsListMembers).where(eq(dealsListMembers.listId, listId));
}

export async function addMember(listId: number, userId: string, userName: string) {
  await db.insert(dealsListMembers).values({
    listId, userId, userName, addedAt: new Date().toISOString(),
  }).onConflictDoNothing();
}

export async function removeMember(listId: number, userId: string) {
  await db.delete(dealsListMembers)
    .where(and(eq(dealsListMembers.listId, listId), eq(dealsListMembers.userId, userId)));
}

export function canAccess(list: { ownerId: string }, members: { userId: string }[], userId: string) {
  return list.ownerId === userId || members.some((m) => m.userId === userId);
}

// ── Jeux ───────────────────────────────────────────────────────────────────────

export async function getGamesForList(listId: number) {
  return db.select().from(dealsGames).where(eq(dealsGames.listId, listId));
}

export async function getAllGames() {
  return db.select().from(dealsGames);
}

export async function getGameByAppId(listId: number, steamAppId: number) {
  const rows = await db.select().from(dealsGames)
    .where(and(eq(dealsGames.listId, listId), eq(dealsGames.steamAppId, steamAppId)));
  return rows[0] ?? null;
}

export async function insertGame(data: {
  listId: number; steamAppId: number; title: string; headerImage: string | null;
  addedById: string; addedByName: string;
  lastKnownPriceEur?: number | null; lastKnownDiscount?: number; isOnSale?: number; lastCheckedAt?: string;
}) {
  await db.insert(dealsGames).values({ ...data, addedAt: new Date().toISOString(), isOnSale: data.isOnSale ?? 0 });
}

export async function deleteGame(id: number) {
  await db.delete(dealsGames).where(eq(dealsGames.id, id));
}

export async function updateGamePrice(id: number, data: {
  lastKnownPriceEur: number | null; lastKnownDiscount: number; isOnSale: number; lastCheckedAt: string;
}) {
  await db.update(dealsGames).set(data).where(eq(dealsGames.id, id));
}
