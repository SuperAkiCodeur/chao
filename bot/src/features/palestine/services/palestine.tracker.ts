import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";
import { getSetting, SETTING_KEYS } from "../../../core/db/settings.js";

const DEFAULT_RSS_URL     = "https://agencemediapalestine.fr/feed/";
const DEFAULT_CHANNEL_ID  = "1510242757627609178";
const POST_HOUR_PARIS     = 9;
const EMBED_COLOR         = 0x009736; // vert du drapeau palestinien

// ── RSS parser ────────────────────────────────────────────────────────────────

type RssItem = {
  title:       string;
  link:        string;
  description: string;
  pubDate:     string;
};

function parseCdata(raw: string): string {
  const m = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : raw;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&[a-z]+;/gi, (e) => {
      const map: Record<string, string> = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
        "&rsquo;": "'", "&lsquo;": "'",
        "&rdquo;": """, "&ldquo;": """,
        "&mdash;": "—", "&ndash;": "–",
        "&hellip;": "…",
      };
      return map[e] ?? e;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];

  for (const itemMatch of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = itemMatch[1];

    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const link     = block.match(/<link>\s*(https?:[^\s<]+)\s*<\/link>/i)?.[1]?.trim()
                  ?? block.match(/<guid[^>]*>\s*(https?:[^\s<]+)\s*<\/guid>/i)?.[1]?.trim()
                  ?? "";
    const descRaw  = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.trim() ?? "";
    const pubDate  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
                  ?? block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i)?.[1]?.trim()
                  ?? "";

    items.push({
      title:       stripHtml(parseCdata(titleRaw)),
      link,
      description: stripHtml(parseCdata(descRaw)),
      pubDate,
    });
  }

  return items;
}

async function fetchRecentItems(rssUrl: string): Promise<RssItem[]> {
  const res = await fetch(rssUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`RSS fetch error: ${res.status}`);

  const xml   = await res.text();
  const items = parseRss(xml);
  const after = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return items.filter((item) => {
    if (!item.pubDate) return true;          // pas de date → on inclut
    const d = new Date(item.pubDate);
    if (isNaN(d.getTime())) return true;     // date illisible → on inclut
    return d >= after;
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Embed ─────────────────────────────────────────────────────────────────────

function buildEmbed(item: RssItem): EmbedBuilder {
  const snippet = item.description.length > 350
    ? item.description.slice(0, 350) + " […]"
    : item.description;

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setAuthor({ name: "Agence Média Palestine", url: "https://agencemediapalestine.fr" })
    .setTitle(item.title.slice(0, 256))
    .setURL(item.link)
    .setDescription(snippet || "​")
    .setTimestamp(item.pubDate ? new Date(item.pubDate) : new Date());
}

// ── Post ──────────────────────────────────────────────────────────────────────

async function postDailyNews(client: Client): Promise<void> {
  const [channelId, rssUrl] = await Promise.all([
    getSetting(SETTING_KEYS.PALESTINE_CHANNEL_ID),
    getSetting(SETTING_KEYS.PALESTINE_SOURCE_URL),
  ]);

  const resolvedChannelId = channelId ?? DEFAULT_CHANNEL_ID;
  const resolvedRssUrl    = rssUrl    ?? DEFAULT_RSS_URL;

  const channel = await client.channels.fetch(resolvedChannelId).catch(() => null);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    logger.warn("[palestine] Salon introuvable ou non textuel", { channelId: resolvedChannelId });
    return;
  }

  let items: RssItem[];

  try {
    items = await fetchRecentItems(resolvedRssUrl);
  } catch (error) {
    logger.error("[palestine] Impossible de récupérer le flux RSS", { error });
    return;
  }

  if (items.length === 0) {
    logger.info("[palestine] Aucun article dans les dernières 24h, post annulé");
    return;
  }

  const item  = pickRandom(items);
  const embed = buildEmbed(item);

  await (channel as { send: Function }).send({ embeds: [embed] });

  logger.info("[palestine] Article du jour posté", {
    title:         item.title,
    link:          item.link,
    totalArticles: items.length,
  });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function msUntilNext9hParis(): number {
  const now      = new Date();
  const nowParis = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));

  const target = new Date(nowParis);
  target.setHours(POST_HOUR_PARIS, 0, 0, 0);
  if (nowParis >= target) target.setDate(target.getDate() + 1);

  return target.getTime() - nowParis.getTime();
}

function scheduleNext(client: Client): void {
  const delay = msUntilNext9hParis();

  logger.info("[palestine] Prochain post planifié", {
    dans: `${(delay / 1000 / 60 / 60).toFixed(1)}h`,
  });

  setTimeout(() => {
    void postDailyNews(client).finally(() => scheduleNext(client));
  }, delay);
}

// ── Export ────────────────────────────────────────────────────────────────────

export function startPalestineTracker(client: Client): void {
  scheduleNext(client);
  logger.info("[palestine] Tracker démarré — post quotidien à 9h (Paris)");
}
