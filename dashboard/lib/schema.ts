// Schema miroir de packages/db/src/schema.ts — garder les deux en sync.
import { integer, pgTable, primaryKey, serial, text } from "drizzle-orm/pg-core";

// ── Cinéma ─────────────────────────────────────────────────────────────────────

export const cinemaParties = pgTable("cinema_parties", {
  messageId:                  text("message_id").primaryKey(),
  guildId:                    text("guild_id").notNull(),
  channelId:                  text("channel_id").notNull(),
  roleId:                     text("role_id").notNull(),
  title:                      text("title").notNull(),
  mediaType:                  text("media_type").notNull(),
  mediaId:                    text("media_id").notNull(),
  viewingAt:                  text("viewing_at").notNull(),
  status:                     text("status").notNull(),
  createdBy:                  text("created_by"),
  startAnnouncementMessageId: text("start_announcement_message_id"),
  ratingChannelId:            text("rating_channel_id"),
  ratingMessageId:            text("rating_message_id"),
  ratingSummaryMessageId:     text("rating_summary_message_id"),
  ratingClosesAt:             text("rating_closes_at"),
});

export const cinemaPartyUsers = pgTable(
  "cinema_party_users",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => cinemaParties.messageId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

export const cinemaPartyRatings = pgTable(
  "cinema_party_ratings",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => cinemaParties.messageId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    rating:  integer("rating").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

// ── Anniversaires ──────────────────────────────────────────────────────────────

export const birthdays = pgTable("birthdays", {
  userId:  text("user_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  day:     integer("day").notNull(),
  month:   integer("month").notNull(),
});

// ── Dashboard ──────────────────────────────────────────────────────────────────

export const dashboardLogs = pgTable("dashboard_logs", {
  id:          serial("id").primaryKey(),
  type:        text("type").notNull(),
  action:      text("action").notNull(),
  description: text("description").notNull(),
  userId:      text("user_id"),
  userName:    text("user_name"),
  metadata:    text("metadata"),
  createdAt:   text("created_at").notNull(),
});

export const dashboardSettings = pgTable("dashboard_settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
