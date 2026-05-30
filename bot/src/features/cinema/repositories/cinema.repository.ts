import { and, eq } from "drizzle-orm";
import { db } from "../../../core/db/client.js";
import {
  cinemaParties as cinemaPartiesTable,
  cinemaPartyRatings as cinemaPartyRatingsTable,
  cinemaPartyUsers as cinemaPartyUsersTable,
} from "../../../core/db/schema.js";
import { CINEMA_CONSTANTS } from "../domain/cinema.constants.js";
import type {
  CinemaContentType,
  CinemaParty,
  CinemaRatingValue,
  CinemaRatings,
  CinemaStatus,
} from "../domain/cinema.types.js";

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function toCinemaParty(
  row: typeof cinemaPartiesTable.$inferSelect,
): Promise<CinemaParty> {
  const [userRows, ratingRows] = await Promise.all([
    db
      .select()
      .from(cinemaPartyUsersTable)
      .where(eq(cinemaPartyUsersTable.messageId, row.messageId)),
    db
      .select()
      .from(cinemaPartyRatingsTable)
      .where(eq(cinemaPartyRatingsTable.messageId, row.messageId)),
  ]);

  const ratings: CinemaRatings = {};

  for (const r of ratingRows) {
    ratings[r.userId] = r.rating as CinemaRatingValue;
  }

  return {
    guildId: row.guildId,
    channelId: row.channelId,
    messageId: row.messageId,
    roleId: row.roleId,
    title: row.title,
    mediaType: row.mediaType as CinemaContentType,
    mediaId: row.mediaId,
    viewingAt: row.viewingAt,
    status: row.status as CinemaStatus,
    createdBy: row.createdBy ?? undefined,
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

export async function findAllCinemaParties(): Promise<CinemaParty[]> {
  const rows = await db.select().from(cinemaPartiesTable);
  return Promise.all(rows.map(toCinemaParty));
}

export async function findCinemaPartyByMessageId(
  messageId: string,
): Promise<CinemaParty | null> {
  const [row] = await db
    .select()
    .from(cinemaPartiesTable)
    .where(eq(cinemaPartiesTable.messageId, messageId));

  return row ? toCinemaParty(row) : null;
}

export async function findCinemaPartyByRatingMessageId(
  ratingMessageId: string,
): Promise<CinemaParty | null> {
  const [row] = await db
    .select()
    .from(cinemaPartiesTable)
    .where(eq(cinemaPartiesTable.ratingMessageId, ratingMessageId));

  return row ? toCinemaParty(row) : null;
}

export async function findActiveCinemaPartiesByGuild(guildId: string): Promise<CinemaParty[]> {
  const rows = await db
    .select()
    .from(cinemaPartiesTable)
    .where(
      and(
        eq(cinemaPartiesTable.guildId, guildId),
        eq(cinemaPartiesTable.status, CINEMA_CONSTANTS.ACTIVE_STATUS),
      ),
    );
  return Promise.all(rows.map(toCinemaParty));
}

export async function findActiveCinemaPartyByMedia(
  mediaType: CinemaContentType,
  mediaId: string,
): Promise<CinemaParty | null> {
  const [row] = await db
    .select()
    .from(cinemaPartiesTable)
    .where(
      and(
        eq(cinemaPartiesTable.mediaType, mediaType),
        eq(cinemaPartiesTable.mediaId, mediaId),
        eq(cinemaPartiesTable.status, CINEMA_CONSTANTS.ACTIVE_STATUS),
      ),
    );

  return row ? toCinemaParty(row) : null;
}

export async function userHasAnotherActiveCinemaParty(
  guildId: string,
  userId: string,
  excludedMessageId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ messageId: cinemaPartiesTable.messageId })
    .from(cinemaPartiesTable)
    .innerJoin(
      cinemaPartyUsersTable,
      eq(cinemaPartiesTable.messageId, cinemaPartyUsersTable.messageId),
    )
    .where(
      and(
        eq(cinemaPartiesTable.guildId, guildId),
        eq(cinemaPartiesTable.status, CINEMA_CONSTANTS.ACTIVE_STATUS),
        eq(cinemaPartyUsersTable.userId, userId),
      ),
    );

  return rows.some((r) => r.messageId !== excludedMessageId);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function saveCinemaParty(cinemaParty: CinemaParty): Promise<void> {
  await db
    .insert(cinemaPartiesTable)
    .values({
      messageId: cinemaParty.messageId,
      guildId: cinemaParty.guildId,
      channelId: cinemaParty.channelId,
      roleId: cinemaParty.roleId,
      title: cinemaParty.title,
      mediaType: cinemaParty.mediaType,
      mediaId: cinemaParty.mediaId,
      viewingAt: cinemaParty.viewingAt,
      status: cinemaParty.status,
      createdBy: cinemaParty.createdBy ?? null,
      startAnnouncementMessageId: cinemaParty.startAnnouncementMessageId ?? null,
      ratingChannelId: cinemaParty.ratingChannelId ?? null,
      ratingMessageId: cinemaParty.ratingMessageId ?? null,
      ratingSummaryMessageId: cinemaParty.ratingSummaryMessageId ?? null,
      ratingClosesAt: cinemaParty.ratingClosesAt ?? null,
    })
    .onConflictDoUpdate({
      target: cinemaPartiesTable.messageId,
      set: {
        status: cinemaParty.status,
        startAnnouncementMessageId: cinemaParty.startAnnouncementMessageId ?? null,
        ratingChannelId: cinemaParty.ratingChannelId ?? null,
        ratingMessageId: cinemaParty.ratingMessageId ?? null,
        ratingSummaryMessageId: cinemaParty.ratingSummaryMessageId ?? null,
        ratingClosesAt: cinemaParty.ratingClosesAt ?? null,
      },
    });
}

export async function deleteCinemaParty(messageId: string): Promise<void> {
  await db
    .delete(cinemaPartiesTable)
    .where(eq(cinemaPartiesTable.messageId, messageId));
}

export async function addUserToCinemaParty(
  messageId: string,
  userId: string,
): Promise<CinemaParty | null> {
  const cinemaParty = await findCinemaPartyByMessageId(messageId);

  if (!cinemaParty) {
    return null;
  }

  await db
    .insert(cinemaPartyUsersTable)
    .values({ messageId, userId })
    .onConflictDoNothing();

  return findCinemaPartyByMessageId(messageId);
}

export async function removeUserFromCinemaParty(
  messageId: string,
  userId: string,
): Promise<CinemaParty | null> {
  const cinemaParty = await findCinemaPartyByMessageId(messageId);

  if (!cinemaParty) {
    return null;
  }

  await db
    .delete(cinemaPartyUsersTable)
    .where(
      and(
        eq(cinemaPartyUsersTable.messageId, messageId),
        eq(cinemaPartyUsersTable.userId, userId),
      ),
    );

  return findCinemaPartyByMessageId(messageId);
}

export async function setCinemaStartAnnouncementMessageId(
  messageId: string,
  startAnnouncementMessageId: string,
): Promise<CinemaParty | null> {
  const [row] = await db
    .update(cinemaPartiesTable)
    .set({ startAnnouncementMessageId })
    .where(eq(cinemaPartiesTable.messageId, messageId))
    .returning();

  return row ? toCinemaParty(row) : null;
}

export async function openCinemaRatingSession(params: {
  messageId: string;
  ratingChannelId: string;
  ratingMessageId: string;
  ratingClosesAt: string;
}): Promise<CinemaParty | null> {
  const [row] = await db
    .update(cinemaPartiesTable)
    .set({
      ratingChannelId: params.ratingChannelId,
      ratingMessageId: params.ratingMessageId,
      ratingClosesAt: params.ratingClosesAt,
    })
    .where(eq(cinemaPartiesTable.messageId, params.messageId))
    .returning();

  return row ? toCinemaParty(row) : null;
}

export async function closeCinemaRatingSession(params: {
  messageId: string;
  ratingSummaryMessageId?: string;
}): Promise<CinemaParty | null> {
  const [row] = await db
    .update(cinemaPartiesTable)
    .set({
      ratingChannelId: null,
      ratingMessageId: null,
      ratingClosesAt: null,
      ratingSummaryMessageId: params.ratingSummaryMessageId ?? null,
    })
    .where(eq(cinemaPartiesTable.messageId, params.messageId))
    .returning();

  return row ? toCinemaParty(row) : null;
}

export async function setCinemaPartyUserRating(params: {
  ratingMessageId: string;
  userId: string;
  rating: CinemaRatingValue;
}): Promise<CinemaParty | null> {
  const cinemaParty = await findCinemaPartyByRatingMessageId(params.ratingMessageId);

  if (!cinemaParty) {
    return null;
  }

  await db
    .insert(cinemaPartyRatingsTable)
    .values({
      messageId: cinemaParty.messageId,
      userId: params.userId,
      rating: params.rating,
    })
    .onConflictDoUpdate({
      target: [cinemaPartyRatingsTable.messageId, cinemaPartyRatingsTable.userId],
      set: { rating: params.rating },
    });

  return findCinemaPartyByMessageId(cinemaParty.messageId);
}

export async function removeCinemaPartyUserRating(params: {
  ratingMessageId: string;
  userId: string;
}): Promise<CinemaParty | null> {
  const cinemaParty = await findCinemaPartyByRatingMessageId(params.ratingMessageId);

  if (!cinemaParty) {
    return null;
  }

  await db
    .delete(cinemaPartyRatingsTable)
    .where(
      and(
        eq(cinemaPartyRatingsTable.messageId, cinemaParty.messageId),
        eq(cinemaPartyRatingsTable.userId, params.userId),
      ),
    );

  return findCinemaPartyByMessageId(cinemaParty.messageId);
}
