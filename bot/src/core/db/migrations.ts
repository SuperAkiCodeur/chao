import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { logger } from "../app/logger.js";

/**
 * Applique les évolutions de schéma non couvertes par un `db:push` manuel.
 * Utilise `CREATE TABLE IF NOT EXISTS` : idempotent, sûr à rejouer à chaque démarrage.
 */
export async function runStartupMigrations(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS birthdays (
        user_id  TEXT PRIMARY KEY,
        guild_id TEXT NOT NULL,
        day      INTEGER NOT NULL,
        month    INTEGER NOT NULL
      )
    `);

    logger.info("[db] Startup migrations applied");
  } catch (error) {
    logger.error("[db] Failed to apply startup migrations", { error });
  }
}
