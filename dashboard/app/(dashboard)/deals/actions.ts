"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dealsLists } from "@/lib/schema";
import { eq } from "drizzle-orm";

export type ActionResult = { success: true } | { success: false; error: string };

export async function setDealsNotifChannel(listId: number, channelId: string | null): Promise<ActionResult> {
  try {
    await db.update(dealsLists)
      .set({ notifChannelId: channelId || null })
      .where(eq(dealsLists.id, listId));
    revalidatePath("/deals");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}
