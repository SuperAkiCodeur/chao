"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { steamConfig, steamGames } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const GUILD_ID = process.env.DISCORD_GUILD_ID!;

export type ActionResult = { success: true } | { success: false; error: string };

// ── Config notif ──────────────────────────────────────────────────────────────

export async function saveSteamConfig(formData: FormData): Promise<ActionResult> {
  try {
    const notifChannelId = (formData.get("notifChannelId") as string | null)?.trim() || null;
    const notifRoleId    = (formData.get("notifRoleId")    as string | null)?.trim() || null;

    const existing = await db.select().from(steamConfig).where(eq(steamConfig.guildId, GUILD_ID));

    if (existing.length > 0) {
      await db.update(steamConfig)
        .set({ notifChannelId, notifRoleId })
        .where(eq(steamConfig.guildId, GUILD_ID));
    } else {
      await db.insert(steamConfig).values({ guildId: GUILD_ID, notifChannelId, notifRoleId });
    }

    revalidatePath("/steam");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}

// ── Suppression d'un jeu ──────────────────────────────────────────────────────

export async function removeSteamGame(id: number): Promise<ActionResult> {
  try {
    await db.delete(steamGames)
      .where(and(eq(steamGames.id, id), eq(steamGames.guildId, GUILD_ID)));
    revalidatePath("/steam");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

