import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { dashboardSettings } from "./schema.js";

export const SETTING_KEYS = {
  // Cinéma
  CINEMA_CHANNEL_ID: "cinema_channel_id",
  CINEMA_SPECTATOR_ROLE_ID: "cinema_spectator_role_id",
  // Membres
  MEMBER_ROLE_ID: "member_role_id",
  // Valorant
  VALORANT_CHANNEL_ID: "valorant_channel_id",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

/** Lit une seule setting depuis la base. Retourne null si non configurée. */
export async function getSetting(key: SettingKey): Promise<string | null> {
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
