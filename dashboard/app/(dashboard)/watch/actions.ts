"use server";

import { db } from "@/lib/db";
import { watchParties } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { addLog } from "@/lib/logger";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export type ActionResult = { success: true } | { success: false; error: string };

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

function discordHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

// ── Lancer ────────────────────────────────────────────────────────────────────

export async function launchWatchParty(formData: FormData): Promise<ActionResult> {
  const title = formData.get("title")?.toString().trim();
  const mediaType = formData.get("mediaType")?.toString() ?? "movie";
  const date = formData.get("date")?.toString().trim();
  const time = formData.get("time")?.toString().trim();

  if (!title || !date || !time) {
    return { success: false, error: "Titre, date et heure sont requis." };
  }

  const [TICKET_CHANNEL_ID, SPECTATOR_ROLE_ID] = await Promise.all([
    getSetting(SETTING_KEYS.WATCH_CHANNEL_ID),
    getSetting(SETTING_KEYS.WATCH_SPECTATOR_ROLE_ID),
  ]);

  if (!TICKET_CHANNEL_ID || !SPECTATOR_ROLE_ID) {
    return { success: false, error: "Configure le salon et le rôle spectateur dans les Paramètres." };
  }

  const viewingAt = new Date(`${date}T${time}:00`);
  if (isNaN(viewingAt.getTime())) {
    return { success: false, error: "Date ou heure invalide." };
  }

  const typeLabel = mediaType === "movie" ? "🎬 Film" : "📺 Série";
  const viewingFormatted = viewingAt.toLocaleString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
  });

  // Post announcement to Discord
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages`, {
    method: "POST",
    headers: discordHeaders(),
    body: JSON.stringify({
      content: `**${typeLabel} — ${title}**\n📅 ${viewingFormatted}\n\nUne diffusion a été programmée depuis le dashboard.`,
    }),
  });

  if (!msgRes.ok) {
    const err = await msgRes.json().catch(() => ({})) as { message?: string };
    return { success: false, error: `Impossible de poster l'annonce Discord : ${err.message ?? msgRes.status}` };
  }

  const msg = await msgRes.json() as { id: string };

  // Insert into DB
  try {
    await db.insert(watchParties).values({
      messageId: msg.id,
      guildId: GUILD_ID,
      channelId: TICKET_CHANNEL_ID,
      roleId: SPECTATOR_ROLE_ID,
      title,
      mediaType,
      mediaId: `dashboard-${msg.id}`,
      viewingAt: viewingAt.toISOString(),
      status: "active",
    });
  } catch {
    return { success: false, error: "Annonce postée, mais erreur lors de l'enregistrement en base." };
  }

  void addLog({
    type: "watch",
    action: "party_created",
    description: `📺 ${mediaType === "movie" ? "Film" : "Série"} programmé depuis le dashboard : « ${title} » le ${viewingFormatted}`,
    metadata: { title, mediaType, viewingAt: viewingAt.toISOString() },
  });

  revalidatePath("/watch");
  return { success: true };
}

// ── Terminer ──────────────────────────────────────────────────────────────────

export async function endWatchParty(messageId: string, title: string): Promise<ActionResult> {
  try {
    await db
      .update(watchParties)
      .set({ status: "ended" })
      .where(and(eq(watchParties.messageId, messageId), eq(watchParties.guildId, GUILD_ID)));

    void addLog({
      type: "watch",
      action: "party_ended",
      description: `✅ Diffusion terminée : « ${title} »`,
      metadata: { messageId, title },
    });

    revalidatePath("/watch");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

// ── Annuler ───────────────────────────────────────────────────────────────────

export async function cancelWatchParty(messageId: string, title: string): Promise<ActionResult> {
  const TICKET_CHANNEL_ID = await getSetting(SETTING_KEYS.WATCH_CHANNEL_ID);
  try {
    // Delete the Discord message (best-effort)
    if (TICKET_CHANNEL_ID) {
      await fetch(`https://discord.com/api/v10/channels/${TICKET_CHANNEL_ID}/messages/${messageId}`, {
        method: "DELETE",
        headers: discordHeaders(),
      }).catch(() => null);
    }

    // Delete from DB (cascade handles users + ratings)
    await db
      .delete(watchParties)
      .where(and(eq(watchParties.messageId, messageId), eq(watchParties.guildId, GUILD_ID)));

    void addLog({
      type: "watch",
      action: "party_cancelled",
      description: `❌ Diffusion annulée : « ${title} »`,
      metadata: { messageId, title },
    });

    revalidatePath("/watch");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
