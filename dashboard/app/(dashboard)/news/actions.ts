"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { newsFeeds, dashboardSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { GUILD_ID, discordHeaders } from "@/lib/discord";
import type { ActionResult } from "@/lib/types";

export async function createFeed(data: {
  name: string; rssUrl: string; channelId: string; color: number;
}): Promise<ActionResult> {
  if (!data.name.trim() || !data.rssUrl.trim() || !data.channelId) {
    return { success: false, error: "Nom, URL RSS et salon sont requis." };
  }
  try {
    await db.insert(newsFeeds).values({
      guildId:   GUILD_ID,
      name:      data.name.trim(),
      rssUrl:    data.rssUrl.trim(),
      channelId: data.channelId,
      color:     data.color,
      createdAt: new Date().toISOString(),
    });
    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur lors de la création." };
  }
}

export async function updateFeed(
  id: number,
  data: { name: string; rssUrl: string; channelId: string; color: number },
): Promise<ActionResult> {
  try {
    await db.update(newsFeeds).set(data).where(eq(newsFeeds.id, id));
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

export async function postArticleNow(data: {
  channelId: string;
  feedName:  string;
  feedUrl:   string;
  color:     number;
  article:   { title: string; url: string; description: string; date: string };
}): Promise<ActionResult> {
  try {
    const { channelId, feedName, feedUrl, color, article } = data;
    const origin  = (() => { try { return new URL(feedUrl).origin; } catch { return feedUrl; } })();
    const snippet = article.description.length > 350
      ? article.description.slice(0, 350) + " […]"
      : article.description;

    const embed = {
      color,
      author:      { name: feedName, url: origin },
      title:       article.title.slice(0, 256),
      url:         article.url,
      description: snippet || null,
      timestamp:   new Date(article.date || Date.now()).toISOString(),
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
    if (msg?.id) {
      const now = new Date().toISOString();
      await db.insert(dashboardSettings)
        .values({ key: `news_post_${msg.id}`, value: "manuel", updatedAt: now })
        .onConflictDoUpdate({ target: dashboardSettings.key, set: { value: "manuel", updatedAt: now } });
    }

    revalidatePath("/news");
    return { success: true };
  } catch {
    return { success: false, error: "Erreur réseau." };
  }
}
