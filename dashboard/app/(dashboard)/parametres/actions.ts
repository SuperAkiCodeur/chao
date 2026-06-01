"use server";

import { saveSettings } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";

export type { ActionResult };

export async function saveSection(formData: FormData): Promise<ActionResult> {
  try {
    const entries: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim()) {
        entries[key] = value.trim();
      }
    }
    await saveSettings(entries);
    revalidatePath("/parametres");
    revalidatePath("/membres");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la sauvegarde." };
  }
}
