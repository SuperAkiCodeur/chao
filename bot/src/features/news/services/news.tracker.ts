import type { Client, TextBasedChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { logger } from "../../../core/app/logger.js";
import { db } from "../../../core/db/client.js";
import { newsFeeds, dashboardSettings } from "../../../core/db/schema.js";
import { insertLog } from "../../../core/db/logger.js";
import { env } from "../../../core/config/env.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type RssItem = { title: string; link: string; description: string; pubDate: string };
type Feed    = typeof newsFeeds.$inferSelect;

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsePostTimes(raw: string | null | undefined): number[] {
  try {
    const arr = JSON.parse(raw ?? "[9]");
    if (!Array.isArray(arr)) return [9];
    return arr.filter((h): h is number => typeof h === "number" && h >= 0 && h < 24);
  } catch {
    return [9];
  }
}

function currentHourParis(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }),
  ).getHours();
}

function msUntilNextHourParis(): number {
  const now      = new Date();
  const paris    = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const nextHour = new Date(paris);
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return nextHour.getTime() - paris.getTime();
}

// ── RSS parser ────────────────────────────────────────────────────────────────

function parseCdata(raw: string): string {
  const m = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : raw;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g,      (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&[a-z]+;/gi, (e) => (
      { “&amp;”:”&”,”&lt;”:”<”,”&gt;”:”>”,”&quot;”:’”’,”&apos;”:”’”,
        "&nbsp;":" ","&rsquo;":"\u2019","&lsquo;":"\u2018","&rdquo;":"\u201D",
        "&ldquo;":"\u201C","&mdash;":"\u2014","&ndash;":"\u2013","&hellip;":"\u2026" }[e] ?? e
    ))
    .replace(/\s+/g, " ").trim();
}

function parseRss(xml: string): RssItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    return {
      title:       stripHtml(parseCdata(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "")),
      link:        b.match(/<link>\s*(https?:[^\s<]+)\s*<\/link>/i)?.[1]?.trim()
                ?? b.match(/<guid[^>]*>\s*(https?:[^\s<]+)\s*<\/guid>/i)?.[1]?.trim() ?? "",
      description: stripHtml(parseCdata(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.trim() ?? "")),
      pubDate:     b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
                ?? b.match(/<dc:date>([\s\S]*?)<\/dc:date>/i)?.[1]?.trim() ?? "",
    };
  });
}

async function fetchRecentItems(rssUrl: string): Promise<RssItem[]> {
  const res = await fetch(rssUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const items = parseRss(await res.text());
  const after = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return items.filter((item) => {
    if (!item.pubDate) return true;
    const d = new Date(item.pubDate);
    return isNaN(d.getTime()) || d >= after;
  });
}

// ── Embed ─────────────────────────────────────────────────────────────────────

function formatFooterDate(raw: string | undefined): string {
  const d   = raw ? new Date(raw) : new Date();
  const ref = isNaN(d.getTime()) ? new Date() : d;
  // Heure Paris
  const p   = new Date(ref.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dd  = String(p.getDate()).padStart(2, "0");
  const mm  = String(p.getMonth() + 1).padStart(2, "0");
  const hh  = String(p.getHours()).padStart(2, "0");
  const min = String(p.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${p.getFullYear()} ${hh}:${min}`;
}

function buildEmbed(item: RssItem, feed: Feed): EmbedBuilder {
  const snippet = item.description.length > 350
    ? item.description.slice(0, 350) + " [...]"
    : item.description;
  const origin     = (() => { try { return new URL(feed.rssUrl).origin; } catch { return feed.rssUrl; } })();
  const authorName = (feed.displaySource || feed.name).slice(0, 256);
  return new EmbedBuilder()
    .setColor(feed.color)
    .setAuthor({ name: authorName, url: origin })
    .setTitle(item.title.slice(0, 256))
    .setURL(item.link)
    .setDescription(snippet || "​")
    .setFooter({ text: formatFooterDate(item.pubDate) });
}

// ── Post ──────────────────────────────────────────────────────────────────────

async function postFeed(client: Client, feed: Feed): Promise<void> {
  const channel = await client.channels.fetch(feed.channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    logger.warn("[news] Salon introuvable", { feed: feed.name, channelId: feed.channelId });
    return;
  }

  let items: RssItem[];
  try {
    items = await fetchRecentItems(feed.rssUrl);
  } catch (error) {
    logger.error("[news] Erreur RSS", { feed: feed.name, error });
    return;
  }

  if (items.length === 0) {
    logger.info("[news] Aucun article dans les 24h", { feed: feed.name });
    return;
  }

  const item  = items[Math.floor(Math.random() * items.length)];
  const embed = buildEmbed(item, feed);
  const sent  = await (channel as TextBasedChannel).send({ embeds: [embed] });

  try {
    const now = new Date().toISOString();
    await db.insert(dashboardSettings)
      .values({ key: `news_post_${sent.id}`, value: "auto", updatedAt: now })
      .onConflictDoUpdate({ target: dashboardSettings.key, set: { value: "auto", updatedAt: now } });
  } catch { /* non bloquant */ }

  void insertLog({
    type:        "news",
    action:      "article_posted",
    description: `📰 [${feed.name}] « ${item.title} »`,
    metadata:    { feedId: feed.id, feedName: feed.name, title: item.title, link: item.link, source: "auto" },
  });

  logger.info("[news] Article posté", { feed: feed.name, title: item.title });
}

// ── Scheduler (check horaire) ─────────────────────────────────────────────────

async function runHourlyCheck(client: Client): Promise<void> {
  const hour = currentHourParis();

  let feeds: Feed[];
  try {
    feeds = env.DISCORD_GUILD_ID
      ? await db.select().from(newsFeeds).where(eq(newsFeeds.guildId, env.DISCORD_GUILD_ID))
      : await db.select().from(newsFeeds);
  } catch (error) {
    logger.error("[news] Impossible de lire les flux (table manquante ?)", { error });
    return;
  }

  if (feeds.length === 0) {
    logger.info("[news] Aucun flux configuré");
    return;
  }

  const due = feeds.filter((f) => parsePostTimes(f.postTimes).includes(hour));

  if (due.length === 0) {
    logger.info("[news] Aucun flux prévu à cette heure", { hour });
    return;
  }

  logger.info("[news] Post planifié", { hour, feeds: due.map((f) => f.name) });
  for (const feed of due) {
    await postFeed(client, feed);
  }
}

function scheduleNext(client: Client): void {
  const delay = msUntilNextHourParis();
  logger.info("[news] Prochaine vérification", { dans: `${(delay / 60000).toFixed(0)}min` });
  setTimeout(() => {
    void runHourlyCheck(client).finally(() => scheduleNext(client));
  }, delay);
}

// ── Export ────────────────────────────────────────────────────────────────────

export function startNewsTracker(client: Client): void {
  scheduleNext(client);
  logger.info("[news] Tracker démarré — vérification à chaque heure pile (Paris)");
}
