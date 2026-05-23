import { boolean, integer, pgTable, primaryKey, serial, text } from "drizzle-orm/pg-core";

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

// ---------------------------------------------------------------------------
// Cémantix
// ---------------------------------------------------------------------------

export const cemantixGames = pgTable("cemantix_games", {
  date: text("date").primaryKey(), // "YYYY-MM-DD" in Europe/Paris
  secretWord: text("secret_word").notNull(),
  isSolved: boolean("is_solved").notNull().default(false),
  winnerId: text("winner_id"),
  winnerName: text("winner_name"),
  announcementMessageId: text("announcement_message_id"),
  rankingMessageId: text("ranking_message_id"),
  startedAt: text("started_at").notNull(),
  solvedAt: text("solved_at"),
});

export const cemantixTopGuesses = pgTable(
  "cemantix_top_guesses",
  {
    gameDate: text("game_date")
      .notNull()
      .references(() => cemantixGames.date, { onDelete: "cascade" }),
    word: text("word").notNull(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    score: integer("score").notNull(), // 0–100
  },
  (t) => [primaryKey({ columns: [t.gameDate, t.word] })],
);

// ---------------------------------------------------------------------------
// Valorant
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Dashboard Logs
// ---------------------------------------------------------------------------

export const dashboardLogs = pgTable("dashboard_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'cemantix' | 'watch' | 'valorant' | 'member' | 'moderation'
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
