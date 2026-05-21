import { integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const watchParties = pgTable("watch_parties", {
  messageId: text("message_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  roleId: text("role_id").notNull(),
  title: text("title").notNull(),
  mediaType: text("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  viewingAt: text("viewing_at").notNull(),
  status: text("status").notNull(),
  startAnnouncementMessageId: text("start_announcement_message_id"),
  ratingChannelId: text("rating_channel_id"),
  ratingMessageId: text("rating_message_id"),
  ratingSummaryMessageId: text("rating_summary_message_id"),
  ratingClosesAt: text("rating_closes_at"),
});

export const watchPartyUsers = pgTable(
  "watch_party_users",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => watchParties.messageId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export const watchPartyRatings = pgTable(
  "watch_party_ratings",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => watchParties.messageId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    rating: integer("rating").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

// ---------------------------------------------------------------------------
// Valorant
// ---------------------------------------------------------------------------

export const valorantSetupMessages = pgTable("valorant_setup_messages", {
  guildId: text("guild_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id").notNull(),
});

export const valorantLinks = pgTable(
  "valorant_links",
  {
    discordUserId: text("discord_user_id").notNull(),
    guildId: text("guild_id").notNull(),
    riotId: text("riot_id").notNull(),
    puuid: text("puuid"),
    region: text("region"),
    linkedAt: text("linked_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.discordUserId, t.guildId] })],
);
