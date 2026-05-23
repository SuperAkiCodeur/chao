import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import {
  watchParties as watchPartiesTable,
  watchPartyRatings as watchPartyRatingsTable,
  watchPartyUsers as watchPartyUsersTable,
} from "../../../core/db/schema.js";
import { WATCH_CONSTANTS } from "../domain/watch.constants.js";
import type {
  WatchContentType,
  WatchParty,
  WatchRatingValue,
  WatchRatings,
  WatchStatus,
} from "../domain/watch.types.js";

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function toWatchParty(
  row: typeof watchPartiesTable.$inferSelect,
): Promise<WatchParty> {
  const [userRows, ratingRows] = await Promise.all([
    db
      .select()
      .from(watchPartyUsersTable)
      .where(eq(watchPartyUsersTable.messageId, row.messageId)),
    db
      .select()
      .from(watchPartyRatingsTable)
      .where(eq(watchPartyRatingsTable.messageId, row.messageId)),
  ]);

  const ratings: WatchRatings = {};

  for (const r of ratingRows) {
    ratings[r.userId] = r.rating as WatchRatingValue;
  }

  return {
    guildId: row.guildId,
    channelId: row.channelId,
    messageId: row.messageId,
    roleId: row.roleId,
    title: row.title,
    mediaType: row.mediaType as WatchContentType,
    mediaId: row.mediaId,
    viewingAt: row.viewingAt,
    status: row.status as WatchStatus,
    users: userRows.map((u) => u.userId),
    startAnnouncementMessageId: row.startAnnouncementMessageId ?? undefined,
    ratingChannelId: row.ratingChannelId ?? undefined,
    ratingMessageId: row.ratingMessageId ?? undefined,
    ratingSummaryMessageId: row.ratingSummaryMessageId ?? undefined,
    ratingClosesAt: row.ratingClosesAt ?? undefined,
    ratings: Object.keys(ratings).length > 0 ? ratings : undefined,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function findAllWatchParties(): Promise<WatchParty[]> {
  const rows = await db.select().from(watchPartiesTable);
  return Promise.all(rows.map(toWatchParty));
}

export async function findWatchPartyByMessageId(
  messageId: string,
): Promise<WatchParty | null> {
  const [row] = await db
    .select()
    .from(watchPartiesTable)
    .where(eq(watchPartiesTable.messageId, messageId));

  return row ? toWatchParty(row) : null;
}

export async function findWatchPartyByRatingMessageId(
  ratingMessageId: string,
): Promise<WatchParty | null> {
  const [row] = await db
    .select()
    .from(watchPartiesTable)
    .where(eq(watchPartiesTable.ratingMessageId, ratingMessageId));

  return row ? toWatchParty(row) : null;
}

export async function findActiveWatchPartyByMedia(
  mediaType: WatchContentType,
  mediaId: string,
): Promise<WatchParty | null> {
  const [row] = await db
    .select()
    .from(watchPartiesTable)
    .where(
      and(
        eq(watchPartiesTable.mediaType, mediaType),
        eq(watchPartiesTable.mediaId, mediaId),
        eq(watchPartiesTable.status, WATCH_CONSTANTS.ACTIVE_STATUS),
      ),
    );

  return row ? toWatchParty(row) : null;
}

export async function userHasAnotherActiveWatchParty(
  guildId: string,
  userId: string,
  excludedMessageId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ messageId: watchPartiesTable.messageId })
    .from(watchPartiesTable)
    .innerJoin(
      watchPartyUsersTable,
      eq(watchPartiesTable.messageId, watchPartyUsersTable.messageId),
    )
    .where(
      and(
        eq(watchPartiesTable.guildId, guildId),
        eq(watchPartiesTable.status, WATCH_CONSTANTS.ACTIVE_STATUS),
        eq(watchPartyUsersTable.userId, userId),
      ),
    );

  return rows.some((r) => r.messageId !== excludedMessageId);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function saveWatchParty(watchParty: WatchParty): Promise<void> {
  await db
    .insert(watchPartiesTable)
    .values({
      messageId: watchParty.messageId,
      guildId: watchParty.guildId,
      channelId: watchParty.channelId,
      roleId: watchParty.roleId,
      title: watchParty.title,
      mediaType: watchParty.mediaType,
      mediaId: watchParty.mediaId,
      viewingAt: watchParty.viewingAt,
      status: watchParty.status,
      startAnnouncementMessageId: watchParty.startAnnouncementMessageId ?? null,
      ratingChannelId: watchParty.ratingChannelId ?? null,
      ratingMessageId: watchParty.ratingMessageId ?? null,
      ratingSummaryMessageId: watchParty.ratingSummaryMessageId ?? null,
      ratingClosesAt: watchParty.ratingClosesAt ?? null,
    })
    .onConflictDoUpdate({
      target: watchPartiesTable.messageId,
      set: {
        status: watchParty.status,
        startAnnouncementMessageId: watchParty.startAnnouncementMessageId ?? null,
        ratingChannelId: watchParty.ratingChannelId ?? null,
        ratingMessageId: watchParty.ratingMessageId ?? null,
        ratingSummaryMessageId: watchParty.ratingSummaryMessageId ?? null,
        ratingClosesAt: watchParty.ratingClosesAt ?? null,
      },
    });
}

export async function deleteWatchParty(messageId: string): Promise<void> {
  await db
    .delete(watchPartiesTable)
    .where(eq(watchPartiesTable.messageId, messageId));
}

export async function addUserToWatchParty(
  messageId: string,
  userId: string,
): Promise<WatchParty | null> {
  const watchParty = await findWatchPartyByMessageId(messageId);

  if (!watchParty) {
    return null;
  }

  await db
    .insert(watchPartyUsersTable)
    .values({ messageId, userId })
    .onConflictDoNothing();

  return findWatchPartyByMessageId(messageId);
}

export async function removeUserFromWatchParty(
  messageId: string,
  userId: string,
): Promise<WatchParty | null> {
  const watchParty = await findWatchPartyByMessageId(messageId);

  if (!watchParty) {
    return null;
  }

  await db
    .delete(watchPartyUsersTable)
    .where(
      and(
        eq(watchPartyUsersTable.messageId, messageId),
        eq(watchPartyUsersTable.userId, userId),
      ),
    );

  return findWatchPartyByMessageId(messageId);
}

export async function setWatchStartAnnouncementMessageId(
  messageId: string,
  startAnnouncementMessageId: string,
): Promise<WatchParty | null> {
  const [row] = await db
    .update(watchPartiesTable)
    .set({ startAnnouncementMessageId })
    .where(eq(watchPartiesTable.messageId, messageId))
    .returning();

  return row ? toWatchParty(row) : null;
}

export async function openWatchRatingSession(params: {
  messageId: string;
  ratingChannelId: string;
  ratingMessageId: string;
  ratingClosesAt: string;
}): Promise<WatchParty | null> {
  const [row] = await db
    .update(watchPartiesTable)
    .set({
      ratingChannelId: params.ratingChannelId,
      ratingMessageId: params.ratingMessageId,
      ratingClosesAt: params.ratingClosesAt,
    })
    .where(eq(watchPartiesTable.messageId, params.messageId))
    .returning();

  return row ? toWatchParty(row) : null;
}

export async function closeWatchRatingSession(params: {
  messageId: string;
  ratingSummaryMessageId?: string;
}): Promise<WatchParty | null> {
  const [row] = await db
    .update(watchPartiesTable)
    .set({
      ratingChannelId: null,
      ratingMessageId: null,
      ratingClosesAt: null,
      ratingSummaryMessageId: params.ratingSummaryMessageId ?? null,
    })
    .where(eq(watchPartiesTable.messageId, params.messageId))
    .returning();

  return row ? toWatchParty(row) : null;
}

export async function setWatchPartyUserRating(params: {
  ratingMessageId: string;
  userId: string;
  rating: WatchRatingValue;
}): Promise<WatchParty | null> {
  const watchParty = await findWatchPartyByRatingMessageId(params.ratingMessageId);

  if (!watchParty) {
    return null;
  }

  await db
    .insert(watchPartyRatingsTable)
    .values({
      messageId: watchParty.messageId,
      userId: params.userId,
      rating: params.rating,
    })
    .onConflictDoUpdate({
      target: [watchPartyRatingsTable.messageId, watchPartyRatingsTable.userId],
      set: { rating: params.rating },
    });

  return findWatchPartyByMessageId(watchParty.messageId);
}

export async function removeWatchPartyUserRating(params: {
  ratingMessageId: string;
  userId: string;
}): Promise<WatchParty | null> {
  const watchParty = await findWatchPartyByRatingMessageId(params.ratingMessageId);

  if (!watchParty) {
    return null;
  }

  await db
    .delete(watchPartyRatingsTable)
    .where(
      and(
        eq(watchPartyRatingsTable.messageId, watchParty.messageId),
        eq(watchPartyRatingsTable.userId, params.userId),
      ),
    );

  return findWatchPartyByMessageId(watchParty.messageId);
}
