/**
 * Script de migration one-shot.
 * Utilisation : fly ssh console -C "node /app/dist/migrate.js"
 *
 * Crée les tables manquantes avec IF NOT EXISTS — idempotent, sans danger.
 */

import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");

  const sql = postgres(url);

  await sql`
    CREATE TABLE IF NOT EXISTS steam_games (
      id                   SERIAL PRIMARY KEY,
      guild_id             TEXT    NOT NULL,
      steam_app_id         INTEGER NOT NULL,
      title                TEXT    NOT NULL,
      header_image         TEXT,
      added_by             TEXT    NOT NULL,
      added_by_name        TEXT,
      added_at             TEXT    NOT NULL,
      last_known_price_eur INTEGER,
      last_known_discount  INTEGER DEFAULT 0,
      last_checked_at      TEXT,
      is_on_sale           INTEGER NOT NULL DEFAULT 0
    )
  `;
  console.log("✓ steam_games");

  await sql`
    CREATE TABLE IF NOT EXISTS steam_config (
      guild_id         TEXT PRIMARY KEY,
      notif_channel_id TEXT,
      notif_role_id    TEXT
    )
  `;
  console.log("✓ steam_config");

  await sql`
    CREATE TABLE IF NOT EXISTS steam_channel_permissions (
      id         SERIAL PRIMARY KEY,
      guild_id   TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      role_id    TEXT NOT NULL
    )
  `;
  console.log("✓ steam_channel_permissions");

  await sql.end();
  console.log("Migration terminée.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
