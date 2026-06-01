import { db } from "@/lib/db";
import { newsFeeds } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { GUILD_ID, fetchGuildChannels } from "@/lib/discord";
import { PageShell } from "@/components/PageShell";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { NewsFeedCard, type Article } from "./NewsFeedCard";
import { AddFeedForm } from "./AddFeedForm";

export const dynamic = "force-dynamic";

// ── RSS parser ────────────────────────────────────────────────────────────────

function parseCdata(raw: string) {
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

function parseRss(xml: string): Article[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const b = m[1];
    return {
      title:       stripHtml(parseCdata(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "")),
      url:         b.match(/<link>\s*(https?:[^\s<]+)\s*<\/link>/i)?.[1]?.trim()
                ?? b.match(/<guid[^>]*>\s*(https?:[^\s<]+)\s*<\/guid>/i)?.[1]?.trim() ?? "",
      description: stripHtml(parseCdata(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.trim() ?? "")),
      date:        b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
                ?? b.match(/<dc:date>([\s\S]*?)<\/dc:date>/i)?.[1]?.trim() ?? "",
    };
  });
}

async function fetchArticles(rssUrl: string): Promise<Article[]> {
  try {
    const res = await fetch(rssUrl, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    return res.ok ? parseRss(await res.text()) : [];
  } catch { return []; }
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function nextPost9h(): string {
  const now    = new Date();
  const paris  = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const target = new Date(paris);
  target.setHours(9, 0, 0, 0);
  if (paris >= target) target.setDate(target.getDate() + 1);
  const diff    = target.getTime() - paris.getTime();
  const hours   = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}min` : `${minutes}min`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NewsPage() {
  const [feeds, channels] = await Promise.all([
    db.select().from(newsFeeds).where(eq(newsFeeds.guildId, GUILD_ID)),
    fetchGuildChannels(),
  ]);

  const feedsWithArticles = await Promise.all(
    feeds.map(async (feed) => ({ ...feed, articles: await fetchArticles(feed.rssUrl) })),
  );

  const countdown = nextPost9h();

  return (
    <PageShell title="News" description="Flux RSS postés quotidiennement à 9h dans les salons Discord">

      {/* Countdown */}
      <div className="anim-fade-in" style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.14)",
        borderRadius: 8, padding: "9px 16px",
      }}>
        <span className="float"><Clock size={12} style={{ color: "#38bdf8", flexShrink: 0 }} /></span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.42)" }}>Prochain post automatique</span>
        <span style={{ fontSize: 19, color: "#38bdf8", fontFamily: "var(--font-serif)" }}>{countdown}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.22)" }}>
          {feeds.length} flux · 9h00 (Paris)
        </span>
      </div>

      {feedsWithArticles.length === 0 && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
          Aucun flux configuré. Ajoute ton premier flux ci-dessous.
        </p>
      )}
      {feedsWithArticles.map((feed) => (
        <NewsFeedCard key={feed.id} feed={feed} channels={channels} />
      ))}
      <AddFeedForm channels={channels} />

    </PageShell>
  );
}
