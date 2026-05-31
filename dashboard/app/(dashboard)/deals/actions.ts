"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dealsConfig, dealsGames } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const GUILD_ID = process.env.DISCORD_GUILD_ID!;

export type ActionResult = { success: true } | { success: false; error: string };

// ── Config notif ──────────────────────────────────────────────────────────────

export async function saveDealsConfig(formData: FormData): Promise<ActionResult> {
  try {
    const notifChannelId = (formData.get("notifChannelId") as string | null)?.trim() || null;
    const notifRoleId    = (formData.get("notifRoleId")    as string | null)?.trim() || null;

    const existing = await db.select().from(dealsConfig).where(eq(dealsConfig.guildId, GUILD_ID));

    if (existing.length > 0) {
      await db.update(dealsConfig)
        .set({ notifChannelId, notifRoleId })
        .where(eq(dealsConfig.guildId, GUILD_ID));
    } else {
      await db.insert(dealsConfig).values({ guildId: GUILD_ID, notifChannelId, notifRoleId });
    }

    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}

// ── Suppression d'un jeu ──────────────────────────────────────────────────────

export async function removeDealsGame(id: number): Promise<ActionResult> {
  try {
    await db.delete(dealsGames)
      .where(and(eq(dealsGames.id, id), eq(dealsGames.guildId, GUILD_ID)));
    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
