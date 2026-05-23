import { db } from "./db";
import { dashboardSettings } from "./schema";
import { inArray, eq } from "drizzle-orm";

export const SETTING_KEYS = {
  // Cinéma
  WATCH_CHANNEL_ID: "watch_channel_id",
  WATCH_SPECTATOR_ROLE_ID: "watch_spectator_role_id",
  // Membres
  MEMBER_ROLE_ID: "member_role_id",
  // Cémantix
  CEMANTIX_CHANNEL_ID: "cemantix_channel_id",
  // Valorant
  VALORANT_CHANNEL_ID: "valorant_channel_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Lit toutes les settings en un seul round-trip. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(dashboardSettings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** Lit une seule setting. */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const [row] = await db
    .select()
    .from(dashboardSettings)
    .where(eq(dashboardSettings.key, key));
  return row?.value ?? null;
}

/** Upsert multiple settings at once. */
export async function saveSettings(entries: Record<string, string>): Promise<void> {
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(entries)) {
    await db
      .insert(dashboardSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: dashboardSettings.key, set: { value, updatedAt: now } });
  }
}
