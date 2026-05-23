"use server";

import { addLog } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

function discordHeaders() {
  return { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" };
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function kickMember(userId: string, userName: string, reason: string): Promise<ActionResult> {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      method: "DELETE",
      headers: { ...discordHeaders(), "X-Audit-Log-Reason": reason || "Expulsion depuis le dashboard" },
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return { success: false, error: err.message ?? `Erreur ${res.status}` };
    }
    void addLog({
      type: "moderation",
      action: "kicked",
      description: `👢 ${userName} a été expulsé${reason ? ` — ${reason}` : ""}`,
      userId,
      userName,
      metadata: { reason },
    });
    revalidatePath("/membres");
    return { success: true };
  } catch {
    return { success: false, error: "Impossible de joindre l'API Discord." };
  }
}

export async function banMember(userId: string, userName: string, reason: string): Promise<ActionResult> {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/bans/${userId}`, {
      method: "PUT",
      headers: { ...discordHeaders(), "X-Audit-Log-Reason": reason || "Bannissement depuis le dashboard" },
      body: JSON.stringify({ delete_message_seconds: 0 }),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return { success: false, error: err.message ?? `Erreur ${res.status}` };
    }
    void addLog({
      type: "moderation",
      action: "banned",
      description: `🔨 ${userName} a été banni${reason ? ` — ${reason}` : ""}`,
      userId,
      userName,
      metadata: { reason },
    });
    revalidatePath("/membres");
    return { success: true };
  } catch {
    return { success: false, error: "Impossible de joindre l'API Discord." };
  }
}

const TIMEOUT_LABELS: Record<string, string> = {
  "3600": "1 heure",
  "86400": "24 heures",
  "604800": "7 jours",
  "2419200": "28 jours",
};

export async function timeoutMember(
  userId: string,
  userName: string,
  durationSeconds: number,
  reason: string,
): Promise<ActionResult> {
  const until = new Date(Date.now() + durationSeconds * 1000).toISOString();
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`, {
      method: "PATCH",
      headers: { ...discordHeaders(), "X-Audit-Log-Reason": reason || "Timeout depuis le dashboard" },
      body: JSON.stringify({ communication_disabled_until: until }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return { success: false, error: err.message ?? `Erreur ${res.status}` };
    }
    const label = TIMEOUT_LABELS[String(durationSeconds)] ?? `${durationSeconds}s`;
    void addLog({
      type: "moderation",
      action: "timeout",
      description: `⏱️ ${userName} mis en sourdine pour ${label}${reason ? ` — ${reason}` : ""}`,
      userId,
      userName,
      metadata: { durationSeconds, reason, until },
    });
    revalidatePath("/membres");
    return { success: true };
  } catch {
    return { success: false, error: "Impossible de joindre l'API Discord." };
  }
}
