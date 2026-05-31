import { PageShell, SectionCard } from "@/components/PageShell";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ExternalLink, Clock } from "lucide-react";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const BOT_TOKEN          = process.env.DISCORD_BOT_TOKEN!;
const DEFAULT_CHANNEL_ID = "1510242757627609178";
const AMP_AUTHOR         = "Agence Média Palestine";
const AMP_HOME           = "https://agencemediapalestine.fr";

// ── Types ─────────────────────────────────────────────────────────────────────

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

async function getChannels(): Promise<DiscordChannel[]> {
  const guildId = process.env.DISCORD_GUILD_ID ?? "";
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" },
  );
  return res.ok ? res.json() : [];
}

// ── Countdown ─────────────────────────────────────────────────────────────────

function nextPost9h(): { label: string; hours: number; minutes: number } {
  const now   = new Date();
  const paris = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const target = new Date(paris);
  target.setHours(9, 0, 0, 0);
  if (paris >= target) target.setDate(target.getDate() + 1);
  const diffMs  = target.getTime() - paris.getTime();
  const hours   = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const label   = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  return { label, hours, minutes };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PalestinePage() {
  const [settings, channels] = await Promise.all([getAllSettings(), getChannels()]);

  const channelId = settings["palestine_channel_id"] ?? DEFAULT_CHANNEL_ID;
  const posts     = await fetchBotPosts(channelId);
  const countdown = nextPost9h();

  return (
    <PageShell title="Palestine" description="Articles postés quotidiennement par le bot à 9h (Paris)">

      {/* Countdown hero */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20,
        background: "rgba(0,151,54,0.08)",
        border: "1px solid rgba(0,151,54,0.20)",
        borderRadius: 14, padding: "20px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: "rgba(0,151,54,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Clock size={20} style={{ color: "#4ade80" }} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginBottom: 4 }}>
              Prochain article
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>
              dans {countdown.label}
            </p>
          </div>
        </div>
        <a
          href={AMP_HOME}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, color: "rgba(255,255,255,0.38)",
            textDecoration: "none", flexShrink: 0,
          }}
        >
          {AMP_AUTHOR}
          <ExternalLink size={11} style={{ opacity: 0.6 }} />
        </a>
      </div>

      {/* Articles */}
      <SectionCard
        title="Articles postés"
        badge={posts.length > 0 ? `${posts.length} article${posts.length !== 1 ? "s" : ""}` : undefined}
        noPadding
      >
        {posts.length === 0 ? (
          <p style={{ padding: 20, fontSize: 14, color: "rgba(255,255,255,0.28)", fontStyle: "italic", textAlign: "center" }}>
            Aucun article trouvé dans ce salon.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {posts.map((post, i) => {
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
                          display: "flex", alignItems: "center", gap: 6,
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
        settings={settings}
        noCollapse
        fields={[
          {
            key:         "palestine_channel_id",
            label:       "Salon source",
            description: "Salon Discord où le bot poste les articles quotidiens",
            kind:        "channel",
          },
        ]}
      />

    </PageShell>
  );
}
