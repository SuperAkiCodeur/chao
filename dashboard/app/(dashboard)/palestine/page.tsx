import { PageShell, SectionCard } from "@/components/PageShell";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { TodayArticlesClient, type TodayArticle } from "./TodayArticlesClient";
import { ArrowSquareOut, Clock } from "@phosphor-icons/react/dist/ssr";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const BOT_TOKEN          = process.env.DISCORD_BOT_TOKEN!;
const DEFAULT_CHANNEL_ID = "1510242757627609178";
const AMP_AUTHOR         = "Agence Média Palestine";
const AMP_HOME           = "https://agencemediapalestine.fr";
const DEFAULT_RSS_URL    = "https://agencemediapalestine.fr/feed/?posts_per_page=20";

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
    // Entités numériques décimales : &#8217; → '
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    // Entités numériques hexadécimales : &#x2019; → '
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    // Entités nommées courantes
    .replace(/&[a-z]+;/gi, (e) => {
      const map: Record<string, string> = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
        "&rsquo;": "’", "&lsquo;": "‘",
        "&rdquo;": "“", "&ldquo;": "”",
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

    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim()       ?? "";
    // Essaye <link>, sinon <guid> (les deux formats WordPress)
    const link     = block.match(/<link>\s*(https?:[^\s<]+)\s*<\/link>/i)?.[1]?.trim()
                  ?? block.match(/<guid[^>]*>\s*(https?:[^\s<]+)\s*<\/guid>/i)?.[1]?.trim()
                  ?? "";
    const descRaw  = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]?.trim() ?? "";
    // Supporte <pubDate> (RSS 2.0) et <dc:date> (Dublin Core)
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

// ── Data fetchers ─────────────────────────────────────────────────────────────

type DiscordEmbed = {
  title?:      string;
  url?:        string;
  description?: string;
  timestamp?:  string;
  author?:     { name: string; url?: string };
};

type DiscordMessage = {
  id:        string;
  timestamp: string;
  embeds?:   DiscordEmbed[];
};

type BotPost = {
  id:          string;
  title:       string;
  url:         string;
  description: string;
  timestamp:   string;
};

async function fetchBotPosts(channelId: string): Promise<BotPost[]> {
  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`,
      { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" },
    );
    if (!res.ok) return [];
    const messages: DiscordMessage[] = await res.json();

    return messages
      .filter((m) => m.embeds?.some((e) => e.author?.name === AMP_AUTHOR))
      .map((m) => {
        const embed = m.embeds!.find((e) => e.author?.name === AMP_AUTHOR)!;
        return {
          id:          m.id,
          title:       embed.title        ?? "(sans titre)",
          url:         embed.url          ?? AMP_HOME,
          description: embed.description  ?? "",
          timestamp:   embed.timestamp    ?? m.timestamp,
        };
      });
  } catch {
    return [];
  }
}

async function fetchLatestArticles(rssUrl: string): Promise<TodayArticle[]> {
  try {
    const res = await fetch(rssUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const items = parseRss(await res.text());
    return items.map((item, idx) => ({
      id:          idx,
      title:       item.title       || "(sans titre)",
      url:         item.link        || rssUrl,
      description: item.description,
      date:        item.pubDate,
    }));
  } catch {
    return [];
  }
}

async function getChannels(): Promise<DiscordChannel[]> {
  const guildId = process.env.DISCORD_GUILD_ID ?? "";
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" },
  );
  return res.ok ? res.json() : [];
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function nextPost9h(): { hours: number; minutes: number } {
  const now   = new Date();
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const target = new Date(paris);
  target.setHours(9, 0, 0, 0);
  if (paris >= target) target.setDate(target.getDate() + 1);
  const diffMs  = target.getTime() - paris.getTime();
  const hours   = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return { hours, minutes };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PalestinePage() {
  const [settings, channels] = await Promise.all([getAllSettings(), getChannels()]);

  const channelId = settings["palestine_channel_id"] ?? DEFAULT_CHANNEL_ID;
  const rssUrl    = settings["palestine_source_url"]  ?? DEFAULT_RSS_URL;

  const [botPosts, todayArticles] = await Promise.all([
    fetchBotPosts(channelId),
    fetchLatestArticles(rssUrl),
  ]);

  const countdown = nextPost9h();

  // Pre-fill default so the input shows the URL even before first save
  const settingsWithDefaults = {
    ...settings,
    palestine_source_url: settings["palestine_source_url"] ?? DEFAULT_RSS_URL,
  };

  // Derive display link from RSS URL
  let sourceDomain = AMP_HOME;
  try { sourceDomain = new URL(rssUrl).origin; } catch { /* keep default */ }

  const countdownLabel = countdown.hours > 0
    ? `${countdown.hours}h ${String(countdown.minutes).padStart(2, "0")}min`
    : `${countdown.minutes}min`;

  return (
    <PageShell title="Palestine" description="Articles postés quotidiennement par le bot à 9h (Paris)">

      {/* Countdown — compact full-width bar */}
      <div className="anim-blur-in" style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12,
        background: "rgba(0,151,54,0.07)",
        border: "1px solid rgba(0,151,54,0.16)",
        borderRadius: 8, padding: "9px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="float"><Clock size={12} style={{ color: "#4ade80", flexShrink: 0 }} /></span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.42)" }}>Prochain article</span>
          <span style={{
            fontSize: 19, color: "#4ade80",
            fontFamily: "var(--font-serif)",
          }}>
            {countdownLabel}
          </span>
        </div>
        <a
          href={sourceDomain}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "rgba(255,255,255,0.28)",
            textDecoration: "none", flexShrink: 0,
          }}
        >
          {AMP_AUTHOR}
          <ArrowSquareOut size={10} />
        </a>
      </div>

      {/* Article du jour — dernier post du bot */}
      {botPosts.length > 0 && (() => {
        const post = botPosts[0];
        const date = new Date(post.timestamp);
        return (
          <div className="anim-fade-up" style={{
            background: "#202020", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>Article du jour</p>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>
                {date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {/* Content */}
            <div style={{ padding: "24px 28px" }}>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: "clamp(22px, 2.5vw, 30px)", fontWeight: 400,
                  color: "#fff", fontFamily: "var(--font-serif)",
                  textDecoration: "none", lineHeight: 1.3, letterSpacing: "-0.01em",
                  display: "inline-flex", alignItems: "flex-start", gap: 8,
                }}
              >
                <span style={{ flex: 1 }}>{post.title}</span>
                <ArrowSquareOut size={16} style={{ flexShrink: 0, opacity: 0.4, marginTop: 6 }} />
              </a>
              {post.description && (
                <p style={{
                  fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 14,
                  lineHeight: 1.7, maxWidth: 680,
                }}>
                  {post.description.slice(0, 320)}{post.description.length > 320 ? " […]" : ""}
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Today's articles */}
      <TodayArticlesClient articles={todayArticles} />

      {/* Bot post history */}
      <SectionCard
        title="Articles postés"
        badge={botPosts.length > 0 ? `${botPosts.length} article${botPosts.length !== 1 ? "s" : ""}` : undefined}
        noPadding
      >
        {botPosts.length === 0 ? (
          <p style={{ padding: 20, fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", textAlign: "center" }}>
            Aucun article trouvé dans ce salon.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {botPosts.map((post, i) => {
              const date    = new Date(post.timestamp);
              const excerpt = post.description.slice(0, 200);
              return (
                <div key={post.id} style={{
                  padding: "16px 20px",
                  borderTop: i > 0 ? "1px solid rgba(255,255,255,0.08)" : undefined,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover-slide"
                        style={{
                          fontSize: 19, fontWeight: 400, color: "#fff",
                          fontFamily: "var(--font-serif)",
                          textDecoration: "none",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {post.title}
                        <ArrowSquareOut size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
                      </a>
                      {excerpt && (
                        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 5, lineHeight: 1.6 }}>
                          {excerpt}{post.description.length > 200 ? " […]" : ""}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, color: "rgba(255,255,255,0.30)",
                      flexShrink: 0, marginTop: 2, whiteSpace: "nowrap",
                    }}>
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Settings */}
      <FeatureSettings
        channels={channels}
        roles={[] as DiscordRole[]}
        settings={settingsWithDefaults}
        noCollapse
        fields={[
          {
            key:         "palestine_channel_id",
            label:       "Salon source",
            description: "Salon Discord où le bot poste les articles quotidiens",
            kind:        "channel",
          },
          {
            key:         "palestine_source_url",
            label:       "Flux RSS",
            description: "URL du flux RSS utilisée par le bot pour récupérer les articles",
            kind:        "text",
            placeholder: DEFAULT_RSS_URL,
          },
        ]}
      />

    </PageShell>
  );
}
