"use server";

import { revalidatePath } from "next/cache";
import { getAllSettings, saveSettings } from "@/lib/settings";
import { discordHeaders } from "@/lib/discord";
import type { ActionResult } from "@/lib/types";

const DEFAULT_CHANNEL_ID = "1510242757627609178";
const AMP_AUTHOR         = "Agence Média Palestine";
const AMP_HOME           = "https://agencemediapalestine.fr";
const EMBED_COLOR        = 0x009736;

export async function postArticleNow(article: {
  title:       string;
  url:         string;
  description: string;
  date:        string;
}): Promise<ActionResult> {
  try {
    const settings  = await getAllSettings();
    const channelId = settings["palestine_channel_id"] ?? DEFAULT_CHANNEL_ID;

    const snippet = article.description.length > 350
      ? article.description.slice(0, 350) + " […]"
      : article.description;

    const embed = {
      color:       EMBED_COLOR,
      author:      { name: AMP_AUTHOR, url: AMP_HOME },
      title:       article.title.slice(0, 256),
      url:         article.url,
      description: snippet,
      timestamp:   article.date ? new Date(article.date).toISOString() : new Date().toISOString(),
    };

    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method:  "POST",
        headers: discordHeaders(),
        body: JSON.stringify({ embeds: [embed] }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { success: false, error: `Discord ${res.status}${text ? ` — ${text}` : ""}` };
    }

    // Mémorise la source pour l'affichage dashboard
    const msg = await res.json().catch(() => null) as { id?: string } | null;
    if (msg?.id) {
      await saveSettings({ [`palestine_post_${msg.id}`]: "manuel" });
    }

    revalidatePath("/palestine");
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erreur réseau" };
  }
}
