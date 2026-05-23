"use server";

import { db } from "@/lib/db";
import { cemantixGames, cemantixTopGuesses } from "@/lib/schema";
import { addLog } from "@/lib/logger";
import { revalidatePath } from "next/cache";

export type ActionResult = { success: true } | { success: false; error: string };

export async function clearCemantixHistory(): Promise<ActionResult> {
  try {
    // cascade supprime aussi cemantixTopGuesses via FK, mais on fait les deux pour être sûr
    await db.delete(cemantixTopGuesses);
    await db.delete(cemantixGames);
    void addLog({
      type: "cemantix",
      action: "history_cleared",
      description: "🗑️ Historique des parties Cémantix vidé",
    });
    revalidatePath("/cemantix");
    return { success: true };
  } catch (err) {
    console.error("[cemantix] clear history error:", err);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
