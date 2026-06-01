import { MembresClient, type DiscordMember } from "./MembresClient";
import type { DiscordRole } from "@/lib/discord";
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

      {/* List */}
      <SectionCard
        title="Liste des membres"
        badge={
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11 }}>👥</span>
              {members.length} membres
            </span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11 }}>🟢</span>
              {onlineCount} connectés
            </span>
          </span>
        }
        noPadding>
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
        noCollapse
        fields={[
          { key: "member_role_id",    label: "Rôle automatique", description: "Attribué dès qu'un membre rejoint le serveur", kind: "role" },
          { key: "moderator_role_id", label: "Rôle modérateur",  description: "Identifie les modérateurs du serveur",          kind: "role" },
        ]}
      />

    </PageShell>
  );
}
