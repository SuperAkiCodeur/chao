"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { newsFeeds, dashboardSettings, dashboardLogs } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { GUILD_ID, discordHeaders } from "@/lib/discord";
import { addLog } from "@/lib/logger";
import type { ActionResult } from "@/lib/types";

export async function createFeed(data: {
  name: string; displaySource: string; rssUrl: string; channelId: string; color: number; postTimes: number[];
}): Promise<ActionResult> {
  if (!data.name.trim() || !data.rssUrl.trim() || !data.channelId) {
    return { success: false, error: "Nom, URL RSS et salon sont requis." };
  }
  if (data.postTimes.length === 0) {
    return { success: false, error: "Au moins une heure de publication est requise." };
  }
  try {
    await db.insert(newsFeeds).values({
      guildId:       GUILD_ID,
      name:          data.name.trim(),
      displaySource: data.displaySource.trim(),
      rssUrl:        data.rssUrl.trim(),
      channelId:     data.channelId,
      color:         data.color,
      postTimes:     JSON.stringify(data.postTimes.sort((a, b) => a - b)),
      createdAt:     new Date().toISOString(),
    });
    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la création." };
  }
}

export async function updateFeed(
  id: number,
  data: { name: string; displaySource: string; rssUrl: string; channelId: string; color: number; postTimes: number[] },
): Promise<ActionResult> {
  if (data.postTimes.length === 0) {
    return { success: false, error: "Au moins une heure de publication est requise." };
  }
  try {
    await db.update(newsFeeds).set({
      ...data,
      displaySource: data.displaySource.trim(),
      postTimes:     JSON.stringify(data.postTimes.sort((a, b) => a - b)),
    }).where(eq(newsFeeds.id, id));
    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

export async function deleteFeed(id: number): Promise<ActionResult> {
  try {
    await db.delete(newsFeeds).where(eq(newsFeeds.id, id));
    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

function formatFooterDate(raw: string | undefined): string {
  const d   = raw ? new Date(raw) : new Date();
  const ref = isNaN(d.getTime()) ? new Date() : d;
  const p   = new Date(ref.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dd  = String(p.getDate()).padStart(2, "0");
  const mm  = String(p.getMonth() + 1).padStart(2, "0");
  const hh  = String(p.getHours()).padStart(2, "0");
  const min = String(p.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${p.getFullYear()} ${hh}:${min}`;
}

export async function postArticleNow(data: {
  feedId:    number;
  channelId: string;
  feedName:  string;
  feedUrl:   string;
  color:     number;
  article:   { title: string; url: string; description: string; date: string; source?: string };
}): Promise<ActionResult> {
  try {
    const { feedId, channelId, feedName, feedUrl, color, article } = data;
    const origin     = (() => { try { return new URL(feedUrl).origin; } catch { return feedUrl; } })();
    const authorName = feedName.slice(0, 256); // feedName = displaySource || name, résolu côté client
    const snippet    = article.description.length > 350
      ? article.description.slice(0, 350) + " […]"
      : article.description;

    const embed = {
      color,
      author:      { name: authorName, url: origin },
      title:       article.title.slice(0, 256),
      url:         article.url,
      description: snippet || null,
      footer:      { text: formatFooterDate(article.date) },
    };

    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { method: "POST", headers: discordHeaders(), body: JSON.stringify({ embeds: [embed] }) },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `Discord ${res.status}${text ? ` — ${text}` : ""}` };
    }

    const msg = await res.json().catch(() => null) as { id?: string } | null;
    const now = new Date().toISOString();

    if (msg?.id) {
      await db.insert(dashboardSettings)
        .values({ key: `news_post_${msg.id}`, value: "manuel", updatedAt: now })
        .onConflictDoUpdate({ target: dashboardSettings.key, set: { value: "manuel", updatedAt: now } });
    }

    void addLog({
      type:        "news",
      action:      "article_posted",
      description: `📰 [${feedName}] « ${article.title} » (manuel)`,
      metadata:    { feedId, feedName, title: article.title, link: article.url, source: "manuel" },
    });

    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur réseau." };
  }
}

// ── Historique ────────────────────────────────────────────────────────────────

export type HistoryEntry = {
  id:       number;
  title:    string;
  link:     string;
  source:   "auto" | "manuel";
  postedAt: string;
};

export async function getFeedHistory(feedId: number): Promise<HistoryEntry[]> {
  try {
    const logs = await db
      .select()
      .from(dashboardLogs)
      .where(eq(dashboardLogs.type, "news"))
      .orderBy(desc(dashboardLogs.id))
      .limit(300);

    return logs
      .filter((log) => {
        try { return (JSON.parse(log.metadata ?? "{}") as { feedId?: number }).feedId === feedId; }
        catch { return false; }
      })
      .map((log) => {
        const meta = (() => { try { return JSON.parse(log.metadata ?? "{}") as { title?: string; link?: string; source?: string }; } catch { return {}; } })();
        return {
          id:       log.id,
          title:    meta.title ?? log.description,
          link:     meta.link  ?? "",
          source:   (meta.source === "manuel" ? "manuel" : "auto") as "auto" | "manuel",
          postedAt: log.createdAt,
        };
      });
  } catch {
    return [];
  }
}
