"use server";

import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ActionResult = { success: true } | { success: false; error: string };

export async function addValorantAccount(formData: FormData): Promise<ActionResult> {
  const discordUserId = formData.get("discordUserId")?.toString().trim();
  const guildId = formData.get("guildId")?.toString().trim();
  const riotId = formData.get("riotId")?.toString().trim();
  const region = formData.get("region")?.toString().trim() || null;

  if (!discordUserId || !guildId || !riotId) {
    return { success: false, error: "Discord User ID, Guild ID et Riot ID sont requis." };
  }

  try {
    await db.insert(valorantLinks).values({
      discordUserId,
      guildId,
      riotId,
      region,
      linkedAt: new Date().toISOString(),
    });
    revalidatePath("/valorant");
    return { success: true };
  } catch {
    return { success: false, error: "Ce compte existe déjà ou une erreur est survenue." };
  }
}

export async function editValorantAccount(
  discordUserId: string,
  guildId: string,
  formData: FormData,
): Promise<ActionResult> {
  const riotId = formData.get("riotId")?.toString().trim();
  const region = formData.get("region")?.toString().trim() || null;

  if (!riotId) {
    return { success: false, error: "Le Riot ID est requis." };
  }

  try {
    await db
      .update(valorantLinks)
      .set({ riotId, region })
      .where(
        and(
          eq(valorantLinks.discordUserId, discordUserId),
          eq(valorantLinks.guildId, guildId),
        ),
      );
    revalidatePath("/valorant");
    return { success: true };
  } catch {
    return { success: false, error: "Une erreur est survenue lors de la mise à jour." };
  }
}

export async function deleteValorantAccount(
  discordUserId: string,
  guildId: string,
): Promise<ActionResult> {
  try {
    await db
      .delete(valorantLinks)
      .where(
        and(
          eq(valorantLinks.discordUserId, discordUserId),
          eq(valorantLinks.guildId, guildId),
        ),
      );
    revalidatePath("/valorant");
    return { success: true };
  } catch {
    return { success: false, error: "Une erreur est survenue lors de la suppression." };
  }
}
