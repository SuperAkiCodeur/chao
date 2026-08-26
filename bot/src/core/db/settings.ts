import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { dashboardSettings } from "./schema.js";

export const SETTING_KEYS = {
  // Cinéma
  CINEMA_SPECTATOR_ROLE_ID: "cinema_spectator_role_id",
  // Membres
  MEMBER_ROLE_ID: "member_role_id",
  // Anniversaires
  BIRTHDAY_CHANNEL_ID: "birthday_channel_id",
  BIRTHDAY_ROLE_ID: "birthday_role_id",
  BIRTHDAY_ANNOUNCEMENT_POSTED: "birthday_announcement_posted",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Lit une seule setting depuis la base. Retourne null si non configurée. */
export async function getSetting(key: SettingKey | string): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(dashboardSettings)
      .where(eq(dashboardSettings.key, key));
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/** Écrit une setting en base (upsert). */
export async function setSetting(key: SettingKey | string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(dashboardSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: dashboardSettings.key, set: { value, updatedAt: now } });
}
