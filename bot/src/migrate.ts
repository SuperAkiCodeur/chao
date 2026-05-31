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

  // Renommer les tables watch_* → cinema_*
  await sql`ALTER TABLE IF EXISTS watch_parties        RENAME TO cinema_parties`;
  console.log("✓ watch_parties → cinema_parties");

  await sql`ALTER TABLE IF EXISTS watch_party_users    RENAME TO cinema_party_users`;
  console.log("✓ watch_party_users → cinema_party_users");

  await sql`ALTER TABLE IF EXISTS watch_party_ratings  RENAME TO cinema_party_ratings`;
  console.log("✓ watch_party_ratings → cinema_party_ratings");

  // Renommer les clés de settings watch_* → cinema_*
  await sql`
    UPDATE dashboard_settings
    SET key = 'cinema_channel_id'
    WHERE key = 'watch_channel_id'
  `;
  console.log("✓ setting watch_channel_id → cinema_channel_id");

  await sql`
    UPDATE dashboard_settings
    SET key = 'cinema_spectator_role_id'
    WHERE key = 'watch_spectator_role_id'
  `;
  console.log("✓ setting watch_spectator_role_id → cinema_spectator_role_id");

  // Convertir les anciens logs type="watch" → "cinema"
  await sql`
    UPDATE dashboard_logs
    SET type = 'cinema'
    WHERE type = 'watch'
  `;
  console.log("✓ logs type watch → cinema");

  // Listes Steam par salon : ajout de channel_id
  await sql`ALTER TABLE steam_games ADD COLUMN IF NOT EXISTS channel_id TEXT NOT NULL DEFAULT ''`;
  console.log("✓ steam_games.channel_id");

  await sql`ALTER TABLE steam_config ADD COLUMN IF NOT EXISTS channel_id TEXT NOT NULL DEFAULT ''`;
  console.log("✓ steam_config.channel_id");

  // Changer la PK de steam_config : guild_id seul → (guild_id, channel_id)
  await sql`ALTER TABLE steam_config DROP CONSTRAINT IF EXISTS steam_config_pkey`;
  await sql`ALTER TABLE steam_config ADD PRIMARY KEY (guild_id, channel_id)`;
  console.log("✓ steam_config PK → (guild_id, channel_id)");

  // Créateur de la diffusion cinéma
  await sql`ALTER TABLE cinema_parties ADD COLUMN IF NOT EXISTS created_by TEXT`;
  console.log("✓ cinema_parties.created_by");

  // Renommer les tables steam_* → deals_* (ancienne structure, déjà faite en prod via SSH)
  await sql`ALTER TABLE IF EXISTS steam_games                RENAME TO deals_games_old`;
  await sql`ALTER TABLE IF EXISTS steam_config               RENAME TO deals_config_old`;
  await sql`ALTER TABLE IF EXISTS steam_channel_permissions  RENAME TO deals_permissions_old`;

  // Supprimer les anciennes tables deals_* (structure channel-based)
  await sql`DROP TABLE IF EXISTS deals_config_old`;
  await sql`DROP TABLE IF EXISTS deals_permissions_old`;
  console.log("✓ anciennes tables deals nettoyées");

  // Nouvelle structure : listes par utilisateur
  await sql`
    CREATE TABLE IF NOT EXISTS deals_lists (
      id               SERIAL PRIMARY KEY,
      guild_id         TEXT NOT NULL,
      owner_id         TEXT NOT NULL,
      owner_name       TEXT NOT NULL,
      name             TEXT NOT NULL,
      notif_channel_id TEXT,
      created_at       TEXT NOT NULL
    )
  `;
  console.log("✓ deals_lists");

  await sql`
    CREATE TABLE IF NOT EXISTS deals_list_members (
      list_id   INTEGER NOT NULL,
      user_id   TEXT    NOT NULL,
      user_name TEXT    NOT NULL,
      added_at  TEXT    NOT NULL,
      PRIMARY KEY (list_id, user_id)
    )
  `;
  console.log("✓ deals_list_members");

  await sql`DROP TABLE IF EXISTS deals_games`;
  await sql`DROP TABLE IF EXISTS deals_games_old`;
  await sql`
    CREATE TABLE IF NOT EXISTS deals_games (
      id                   SERIAL PRIMARY KEY,
      list_id              INTEGER NOT NULL,
      steam_app_id         INTEGER NOT NULL,
      title                TEXT    NOT NULL,
      header_image         TEXT,
      added_by_id          TEXT    NOT NULL,
      added_by_name        TEXT    NOT NULL,
      added_at             TEXT    NOT NULL,
      last_known_price_eur INTEGER,
      last_known_discount  INTEGER DEFAULT 0,
      last_checked_at      TEXT,
      is_on_sale           INTEGER NOT NULL DEFAULT 0
    )
  `;
  console.log("✓ deals_games (nouvelle structure)");

  await sql.end();
  console.log("Migration terminée.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
