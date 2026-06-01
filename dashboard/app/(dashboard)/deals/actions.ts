"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dealsConfig, dealsGames } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { GUILD_ID } from "@/lib/discord";
import type { ActionResult } from "@/lib/types";

export async function createDealsList(data: {
  channelId: string; name: string; notifChannelId?: string;
}): Promise<ActionResult> {
  if (!data.channelId) return { success: false, error: "Salon invalide." };
  try {
    const existing = await db.select().from(dealsConfig)
      .where(and(eq(dealsConfig.guildId, GUILD_ID), eq(dealsConfig.channelId, data.channelId)));
    if (existing.length > 0) return { success: false, error: "Une liste existe déjà pour ce salon." };
    await db.insert(dealsConfig).values({
      guildId: GUILD_ID,
      channelId: data.channelId,
      name: data.name.trim() || null,
      notifChannelId: data.notifChannelId || null,
    });
    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la création." };
  }
}

export async function saveDealsNotifChannel(channelId: string, notifChannelId: string): Promise<ActionResult> {
  if (!channelId) return { success: false, error: "Salon invalide." };
  try {
    const existing = await db.select().from(dealsConfig)
      .where(and(eq(dealsConfig.guildId, GUILD_ID), eq(dealsConfig.channelId, channelId)));

    if (existing.length > 0) {
      await db.update(dealsConfig)
        .set({ notifChannelId: notifChannelId || null })
        .where(and(eq(dealsConfig.guildId, GUILD_ID), eq(dealsConfig.channelId, channelId)));
    } else {
      await db.insert(dealsConfig).values({
        guildId: GUILD_ID,
        channelId,
        notifChannelId: notifChannelId || null,
      });
    }
    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}

export async function renameDeals(channelId: string, name: string): Promise<ActionResult> {
  if (!channelId) return { success: false, error: "Salon invalide." };
  try {
    const existing = await db.select().from(dealsConfig)
      .where(and(eq(dealsConfig.guildId, GUILD_ID), eq(dealsConfig.channelId, channelId)));
    if (existing.length > 0) {
      await db.update(dealsConfig).set({ name: name.trim() || null })
        .where(and(eq(dealsConfig.guildId, GUILD_ID), eq(dealsConfig.channelId, channelId)));
    } else {
      await db.insert(dealsConfig).values({ guildId: GUILD_ID, channelId, name: name.trim() || null, notifChannelId: null });
    }
    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors du renommage." };
  }
}

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
