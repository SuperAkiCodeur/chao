import { PageShell, SectionCard } from "@/components/PageShell";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { TodayArticlesClient, type TodayArticle } from "./TodayArticlesClient";
import { ExternalLink, Clock } from "lucide-react";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const BOT_TOKEN          = process.env.DISCORD_BOT_TOKEN!;
const DEFAULT_CHANNEL_ID = "1510242757627609178";
const AMP_AUTHOR         = "Agence Média Palestine";
const AMP_HOME           = "https://agencemediapalestine.fr";
const DEFAULT_SOURCE_URL = "https://agencemediapalestine.fr/wp-json/wp/v2/posts";

// ── Types ─────────────────────────────────────────────────────────────────────

type WpPost = {
  id:      number;
  link:    string;
  title:   { rendered: string };
  excerpt: { rendered: string };
  date:    string;
};

type DiscordEmbed = {
  title?:       string;
  url?:         string;
  description?: string;
  timestamp?:   string;
  author?:      { name: string; url?: string };
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, (e) => {
      const map: Record<string, string> = {
        "&amp;": "&", "&lt;": "<", "&gt;": ">",
        "&quot;": '"', "&#039;": "'", "&nbsp;": " ",
      };
      return map[e] ?? e;
    })
    .trim();
}

// ── Data ──────────────────────────────────────────────────────────────────────

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
          title:       embed.title       ?? "(sans titre)",
          url:         embed.url         ?? AMP_HOME,
          description: embed.description ?? "",
          timestamp:   embed.timestamp   ?? m.timestamp,
        };
      });
  } catch {
    return [];
  }
}

async function fetchTodayArticles(sourceUrl: string): Promise<TodayArticle[]> {
  try {
    // Start of today in Paris time
    const now   = new Date();
    const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const start = new Date(paris);
    start.setHours(0, 0, 0, 0);

    const url = `${sourceUrl}?per_page=20&after=${encodeURIComponent(start.toISOString())}&_fields=id,link,title,excerpt,date&orderby=date&order=desc`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];

    const posts: WpPost[] = await res.json();
    return posts.map((p) => ({
      id:          p.id,
      title:       stripHtml(p.title.rendered),
      url:         p.link,
      description: stripHtml(p.excerpt.rendered),
      date:        p.date,
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
  const sourceUrl = settings["palestine_source_url"]  ?? DEFAULT_SOURCE_URL;

  const [botPosts, todayArticles] = await Promise.all([
    fetchBotPosts(channelId),
    fetchTodayArticles(sourceUrl),
  ]);

  const countdown = nextPost9h();

  // Pre-fill defaults so the input shows the actual URL even if not saved yet
  const settingsWithDefaults = {
    ...settings,
    palestine_source_url: settings["palestine_source_url"] ?? DEFAULT_SOURCE_URL,
  };

  // Derive link domain from source URL
  let sourceDomain = AMP_HOME;
  try { sourceDomain = new URL(sourceUrl).origin; } catch { /* keep default */ }

  const countdownLabel = countdown.hours > 0
    ? `${countdown.hours}h ${String(countdown.minutes).padStart(2, "0")}min`
    : `${countdown.minutes}min`;

  return (
    <PageShell title="Palestine" description="Articles postés quotidiennement par le bot à 9h (Paris)">

      {/* Countdown — compact single line */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        alignSelf: "flex-start",
        background: "rgba(0,151,54,0.07)",
        border: "1px solid rgba(0,151,54,0.16)",
        borderRadius: 8, padding: "7px 14px",
      }}>
        <Clock size={12} style={{ color: "#4ade80", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.42)" }}>
          Prochain article{" "}
          <span style={{ fontWeight: 700, color: "#4ade80" }}>dans {countdownLabel}</span>
        </span>
        <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>·</span>
        <a
          href={sourceDomain}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "rgba(255,255,255,0.30)",
            textDecoration: "none",
          }}
        >
          {AMP_AUTHOR}
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Today's articles (client — has post button) */}
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
                          fontSize: 14, fontWeight: 600, color: "#fff",
                          textDecoration: "none",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}
                      >
                        {post.title}
                        <ExternalLink size={11} style={{ flexShrink: 0, opacity: 0.4 }} />
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
            label:       "Flux RSS / API",
            description: "URL de l'API WordPress utilisée par le bot pour récupérer les articles",
            kind:        "text",
            placeholder: DEFAULT_SOURCE_URL,
          },
        ]}
      />

    </PageShell>
  );
}
