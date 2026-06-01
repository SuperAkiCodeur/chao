import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { eq } from "drizzle-orm";
import { logger } from "../../../core/app/logger.js";
import { db } from "../../../core/db/client.js";
import { newsFeeds, dashboardSettings } from "../../../core/db/schema.js";
import { insertLog } from "../../../core/db/logger.js";
import { env } from "../../../core/config/env.js";

const POST_HOUR_PARIS = 9;

// ── Types ─────────────────────────────────────────────────────────────────────

type RssItem = { title: string; link: string; description: string; pubDate: string };
type Feed    = typeof newsFeeds.$inferSelect;

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
      { "&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'",
        "&nbsp;":" ","&rsquo;":"'","&lsquo;":"'","&rdquo;":"”",
        "&ldquo;":"“","&mdash;":"—","&ndash;":"–","&hellip;":"…" }[e] ?? e
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

function buildEmbed(item: RssItem, feed: Feed): EmbedBuilder {
  const snippet = item.description.length > 350
    ? item.description.slice(0, 350) + " [...]"
    : item.description;
  const origin = (() => { try { return new URL(feed.rssUrl).origin; } catch { return feed.rssUrl; } })();
  return new EmbedBuilder()
    .setColor(feed.color)
    .setAuthor({ name: feed.name, url: origin })
    .setTitle(item.title.slice(0, 256))
    .setURL(item.link)
    .setDescription(snippet || "​")
    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());
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
  const sent  = await (channel as { send: Function }).send({ embeds: [embed] });

  try {
    const now = new Date().toISOString();
    await db.insert(dashboardSettings)
      .values({ key: `news_post_${sent.id}`, value: "auto", updatedAt: now })
      .onConflictDoUpdate({ target: dashboardSettings.key, set: { value: "auto", updatedAt: now } });
  } catch { /* non bloquant */ }

  void insertLog({
    type: "news",
    action: "article_posted",
    description: `📰 [${feed.name}] « ${item.title} »`,
    metadata: { feedId: feed.id, feedName: feed.name, title: item.title, link: item.link },
  });

  logger.info("[news] Article poste", { feed: feed.name, title: item.title });
}

async function postAllFeeds(client: Client): Promise<void> {
  const feeds = env.DISCORD_GUILD_ID
    ? await db.select().from(newsFeeds).where(eq(newsFeeds.guildId, env.DISCORD_GUILD_ID))
    : await db.select().from(newsFeeds);

  if (feeds.length === 0) {
    logger.info("[news] Aucun flux configure");
    return;
  }

  for (const feed of feeds) {
    await postFeed(client, feed);
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function msUntilNext9hParis(): number {
  const now      = new Date();
  const nowParis = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const target   = new Date(nowParis);
  target.setHours(POST_HOUR_PARIS, 0, 0, 0);
  if (nowParis >= target) target.setDate(target.getDate() + 1);
  return target.getTime() - nowParis.getTime();
}

function scheduleNext(client: Client): void {
  const delay = msUntilNext9hParis();
  logger.info("[news] Prochain post planifie", { dans: `${(delay / 3600000).toFixed(1)}h` });
  setTimeout(() => {
    void postAllFeeds(client).finally(() => scheduleNext(client));
  }, delay);
}

// ── Export ────────────────────────────────────────────────────────────────────

export function startNewsTracker(client: Client): void {
  scheduleNext(client);
  logger.info("[news] Tracker demarre -- post quotidien a 9h (Paris)");
}
