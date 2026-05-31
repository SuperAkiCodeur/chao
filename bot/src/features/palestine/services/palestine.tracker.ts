import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";

const RSS_URL         = "https://agencemediapalestine.fr/feed/";
const NEWS_CHANNEL_ID = "1510242757627609178";
const POST_HOUR_PARIS = 9;
const EMBED_COLOR     = 0x009736; // vert du drapeau palestinien

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
    .replace(/&[a-z#0-9]+;/gi, (e) => {
      const map: Record<string, string> = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#039;": "'", "&nbsp;": " ",
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

    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
    const link     = block.match(/<link>\s*(https?:[^\s<]+)\s*<\/link>/)?.[1]?.trim()
                  ?? block.match(/<guid[^>]*>\s*(https?:[^\s<]+)\s*<\/guid>/)?.[1]?.trim()
                  ?? "";
    const descRaw  = block.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() ?? "";
    const pubDate  = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";

    if (!link) continue;

    items.push({
      title:       stripHtml(parseCdata(titleRaw)),
      link,
      description: stripHtml(parseCdata(descRaw)),
      pubDate,
    });
  }

  return items;
}

async function fetchRecentItems(): Promise<RssItem[]> {
  const res = await fetch(RSS_URL, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`RSS fetch error: ${res.status}`);

  const xml   = await res.text();
  const items = parseRss(xml);
  const after = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return items.filter((item) => {
    if (!item.pubDate) return true;
    const d = new Date(item.pubDate);
    return !isNaN(d.getTime()) && d >= after;
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
  const channel = await client.channels.fetch(NEWS_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    logger.warn("[palestine] Salon introuvable ou non textuel", { channelId: NEWS_CHANNEL_ID });
    return;
  }

  let items: RssItem[];

  try {
    items = await fetchRecentItems();
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
