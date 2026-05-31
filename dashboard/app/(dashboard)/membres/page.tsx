import { MembresClient, type DiscordMember, type DiscordRole } from "./MembresClient";
import { FeatureSettings } from "@/components/FeatureSettings";
import { getAllSettings } from "@/lib/settings";
import { PageShell, SectionCard } from "@/components/PageShell";

export const dynamic = "force-dynamic";

async function getMembers(): Promise<DiscordMember[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=100`, {
    headers: { Authorization: `Bot ${botToken}` }, cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json() as Promise<DiscordMember[]>;
}

async function getOnlineCount(): Promise<number> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return 0;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
    headers: { Authorization: `Bot ${botToken}` }, cache: "no-store",
  });
  if (!res.ok) return 0;
  const guild = await res.json() as { approximate_presence_count?: number };
  return guild.approximate_presence_count ?? 0;
}

async function getRoles(): Promise<DiscordRole[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${botToken}` }, cache: "no-store",
  });
  if (!res.ok) return [];
  const roles = await res.json() as DiscordRole[];
  return roles.sort((a, b) => b.position - a.position);
}

export default async function MembresPage() {
  const [members, roles, settings, onlineCount] = await Promise.all([
    getMembers(), getRoles(), getAllSettings(), getOnlineCount(),
  ]);

  return (
    <PageShell title="Membres" description="Gestion et modération des membres du serveur">

      {/* Stats — pill discret */}
      <div className="anim-scale-in" style={{
        display: "flex", alignSelf: "flex-start", alignItems: "center", gap: 0,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8, overflow: "hidden",
      }}>
        {[
          { value: members.length, label: "membres",  icon: "👥" },
          { value: onlineCount,    label: "connectés", icon: "🟢" },
        ].map(({ value, label, icon }, i) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px",
            borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.07)" : undefined,
          }}>
            <span style={{ fontSize: 11 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "var(--font-serif)" }}>{value}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* List */}
      <SectionCard title="Liste des membres" badge={`${members.length} membre${members.length !== 1 ? "s" : ""}`} noPadding>
        <div>
          {members.length === 0 ? (
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.30)", padding: "20px 0" }}>
              Impossible de récupérer les membres. Vérifie que{" "}
              <code style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>DISCORD_GUILD_ID</code>
              {" "}et{" "}
              <code style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>DISCORD_BOT_TOKEN</code>
              {" "}sont configurés.
            </p>
          ) : (
            <MembresClient members={members} roles={roles} />
          )}
        </div>
      </SectionCard>

      <FeatureSettings
        channels={[]}
        roles={roles}
        settings={settings}
        fields={[
          { key: "member_role_id", label: "Rôle automatique", description: "Attribué dès qu'un membre rejoint le serveur", kind: "role" },
        ]}
      />

    </PageShell>
  );
}
