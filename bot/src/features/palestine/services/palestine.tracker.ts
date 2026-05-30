import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { logger } from "../../../core/app/logger.js";

const WP_API_URL      = "https://agencemediapalestine.fr/wp-json/wp/v2/posts";
const NEWS_CHANNEL_ID = "1510242757627609178";
const POST_HOUR_PARIS = 9;
const EMBED_COLOR     = 0x009736; // vert du drapeau palestinien

type WpPost = {
  id:      number;
  link:    string;
  title:   { rendered: string };
  excerpt: { rendered: string };
  date:    string;
};

// ── API WordPress ─────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, (e) => {
    const entities: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#039;": "'", "&nbsp;": " " };
    return entities[e] ?? e;
  }).trim();
}

async function fetchRecentPosts(): Promise<WpPost[]> {
  const after = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const url   = `${WP_API_URL}?per_page=100&after=${encodeURIComponent(after)}&_fields=id,link,title,excerpt,date`;

  const res   = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!res.ok) {
    throw new Error(`WP API error: ${res.status}`);
  }

  return res.json() as Promise<WpPost[]>;
}

function pickRandom(posts: WpPost[]): WpPost {
  return posts[Math.floor(Math.random() * posts.length)];
}

// ── Embed ─────────────────────────────────────────────────────────────────────

function buildEmbed(post: WpPost): EmbedBuilder {
  const title   = stripHtml(post.title.rendered);
  const excerpt = stripHtml(post.excerpt.rendered);
  const snippet = excerpt.slice(0, 350) + (excerpt.length > 350 ? " […]" : "");

  return new EmbedBuilder()
    .setColor(EMBED_COLOR)
    .setAuthor({ name: "Agence Média Palestine", url: "https://agencemediapalestine.fr" })
    .setTitle(title.slice(0, 256))
    .setURL(post.link)
    .setDescription(snippet)
    .setTimestamp(new Date(post.date));
}

// ── Post ──────────────────────────────────────────────────────────────────────

async function postDailyNews(client: Client): Promise<void> {
  const channel = await client.channels.fetch(NEWS_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased() || !("send" in channel)) {
    logger.warn("[palestine] Salon introuvable ou non textuel", { channelId: NEWS_CHANNEL_ID });
    return;
  }

  let posts: WpPost[];

  try {
    posts = await fetchRecentPosts();
  } catch (error) {
    logger.error("[palestine] Impossible de récupérer les articles", { error });
    return;
  }

  if (posts.length === 0) {
    logger.info("[palestine] Aucun article dans les dernières 24h, post annulé");
    return;
  }

  const post  = pickRandom(posts);
  const embed = buildEmbed(post);

  await (channel as { send: Function }).send({ embeds: [embed] });

  logger.info("[palestine] Article du jour posté", {
    title:         post.title.rendered,
    link:          post.link,
    totalArticles: posts.length,
  });
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

function msUntilNext9hParis(): number {
  const now      = new Date();
  const nowParis = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));

  const target = new Date(nowParis);
  target.setHours(POST_HOUR_PARIS, 0, 0, 0);

  if (nowParis >= target) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - nowParis.getTime();
}

function scheduleNext(client: Client): void {
  const delay = msUntilNext9hParis();

  logger.info("[palestine] Prochain post planifié", {
    dans: `${(delay / 1000 / 60 / 60).toFixed(1)}h`,
  });

  setTimeout(() => {
    void postDailyNews(client).finally(() => {
      scheduleNext(client);
    });
  }, delay);
}

// ── Export ────────────────────────────────────────────────────────────────────

export function startPalestineTracker(client: Client): void {
  scheduleNext(client);
  logger.info("[palestine] Tracker démarré — post quotidien à 9h (Paris)");
}
