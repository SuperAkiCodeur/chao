import { Users, Activity } from "lucide-react";
import { MembresClient, type DiscordMember, type DiscordRole } from "./MembresClient";
import { FeatureSettings } from "@/components/FeatureSettings";
import { CommandsReference } from "@/components/CommandsReference";
import { getAllSettings } from "@/lib/settings";
import { PageShell, StatCard, SectionCard } from "@/components/PageShell";

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

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        <StatCard value={members.length} label="Membres" sub="affichés (max 100)" />
        <StatCard value={onlineCount} label="Connectés" sub="en ligne actuellement" />
      </div>

      {/* List */}
      <SectionCard title="Liste des membres" badge={`${members.length} membre${members.length !== 1 ? "s" : ""}`} noPadding>
        <div>
          {members.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", padding: "20px 0" }}>
              Impossible de récupérer les membres. Vérifie que{" "}
              <code style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>DISCORD_GUILD_ID</code>
              {" "}et{" "}
              <code style={{ fontFamily: "monospace", fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>DISCORD_BOT_TOKEN</code>
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

      <CommandsReference commands={[
        {
          name: "Auto-rôle à l'arrivée",
          description: "À chaque fois qu'un nouveau membre rejoint le serveur, le bot lui attribue automatiquement le rôle configuré dans la section Configuration ci-dessus.",
          note: "Ce n'est pas une commande slash — c'est un comportement automatique déclenché par l'événement guildMemberAdd de Discord.",
        },
        {
          name: "/selfrole create",
          description: "Poste un message interactif dans un salon avec des boutons permettant aux membres de s'attribuer ou de retirer eux-mêmes un rôle d'un simple clic.",
          adminOnly: true,
          params: [
            { name: "channel", description: "Salon texte où le message de sélection de rôles sera posté.", required: true },
            { name: "title", description: "Titre affiché en haut de l'embed du message.", required: true },
            { name: "role1", description: "Premier rôle à proposer (au moins un requis).", required: true },
            { name: "role2 … role5", description: "Rôles supplémentaires à proposer (jusqu'à 5 au total).", required: false },
            { name: "description", description: "Texte affiché sous le titre dans l'embed.", required: false },
            { name: "color", description: "Couleur de la barre latérale de l'embed en hexadécimal — ex : #ff4655.", required: false },
          ],
        },
      ]} />

    </PageShell>
  );
}
