import { integer, pgTable, primaryKey, serial, text } from "drizzle-orm/pg-core";

export const cinemaParties = pgTable("cinema_parties", {
  messageId: text("message_id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  roleId: text("role_id").notNull(),
  title: text("title").notNull(),
  mediaType: text("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  viewingAt: text("viewing_at").notNull(),
  status: text("status").notNull(),
  createdBy: text("created_by"),
  startAnnouncementMessageId: text("start_announcement_message_id"),
  ratingChannelId: text("rating_channel_id"),
  ratingMessageId: text("rating_message_id"),
  ratingSummaryMessageId: text("rating_summary_message_id"),
  ratingClosesAt: text("rating_closes_at"),
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
    rating: integer("rating").notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
);

// ---------------------------------------------------------------------------
// Valorant
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Dashboard Logs
// ---------------------------------------------------------------------------

export const dashboardLogs = pgTable("dashboard_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'cinema' | 'valorant' | 'member' | 'moderation'
  action: text("action").notNull(),
  description: text("description").notNull(),
  userId: text("user_id"),
  userName: text("user_name"),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").notNull(),
});

export const dashboardSettings = pgTable("dashboard_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
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

// ---------------------------------------------------------------------------
// Steam
// ---------------------------------------------------------------------------

export const steamGames = pgTable("steam_games", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull().default(""),  // liste par salon
  steamAppId: integer("steam_app_id").notNull(),
  title: text("title").notNull(),
  headerImage: text("header_image"),
  addedBy: text("added_by").notNull(),
  addedByName: text("added_by_name"),
  addedAt: text("added_at").notNull(),
  lastKnownPriceEur: integer("last_known_price_eur"),   // centimes
  lastKnownDiscount: integer("last_known_discount").default(0),
  lastCheckedAt: text("last_checked_at"),
  isOnSale: integer("is_on_sale").default(0).notNull(), // 0 | 1
});

export const steamConfig = pgTable(
  "steam_config",
  {
    guildId: text("guild_id").notNull(),
    channelId: text("channel_id").notNull().default(""), // config par salon
    notifChannelId: text("notif_channel_id"),
    notifRoleId: text("notif_role_id"),
  },
  (t) => [primaryKey({ columns: [t.guildId, t.channelId] })],
);

export const steamChannelPermissions = pgTable("steam_channel_permissions", {
  id: serial("id").primaryKey(),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  roleId: text("role_id").notNull(),
});
