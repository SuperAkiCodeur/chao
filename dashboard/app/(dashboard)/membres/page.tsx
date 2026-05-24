import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity } from "lucide-react";
import { MembresClient, type DiscordMember, type DiscordRole } from "./MembresClient";
import { FeatureSettings } from "@/components/FeatureSettings";
import { CommandsReference } from "@/components/CommandsReference";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function getMembers(): Promise<DiscordMember[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return [];
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members?limit=100`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (!res.ok) return [];
  return res.json() as Promise<DiscordMember[]>;
}

async function getOnlineCount(): Promise<number> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return 0;
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (!res.ok) return 0;
  const guild = await res.json() as { approximate_presence_count?: number };
  return guild.approximate_presence_count ?? 0;
}

async function getRoles(): Promise<DiscordRole[]> {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !botToken) return [];
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/roles`,
    { headers: { Authorization: `Bot ${botToken}` }, cache: "no-store" },
  );
  if (!res.ok) return [];
  const roles = await res.json() as DiscordRole[];
  // Sort by position desc so highest roles come first
  return roles.sort((a, b) => b.position - a.position);
}

export default async function MembresPage() {
  const [members, roles, settings, onlineCount] = await Promise.all([
    getMembers(), getRoles(), getAllSettings(), getOnlineCount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Membres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestion et modération des membres du serveur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{members.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Membres</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">affichés (max 100)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700/10">
                <Activity className="h-4 w-4 text-emerald-700" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{onlineCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Connectés</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">en ligne actuellement</p>
          </CardContent>
        </Card>
      </div>

      {/* Members list */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Liste des membres</CardTitle>
            <Badge variant="secondary">{members.length} membre{members.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Impossible de récupérer les membres. Vérifie que <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">DISCORD_GUILD_ID</code> et <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">DISCORD_BOT_TOKEN</code> sont configurés.
            </p>
          ) : (
            <MembresClient members={members} roles={roles} />
          )}
        </CardContent>
      </Card>

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
          description:
            "À chaque fois qu'un nouveau membre rejoint le serveur, le bot lui attribue automatiquement le rôle configuré dans la section Configuration ci-dessus. Aucune action n'est requise de la part du membre. Si aucun rôle n'est configuré, le comportement est désactivé.",
          note: "Ce n'est pas une commande slash — c'est un comportement automatique déclenché par l'événement guildMemberAdd de Discord.",
        },
        {
          name: "/selfrole create",
          description:
            "Poste un message interactif dans un salon avec des boutons permettant aux membres de s'attribuer ou de retirer eux-mêmes un rôle d'un simple clic. Jusqu'à 5 rôles par message. Le bot bascule le rôle à chaque clic (attribution si absent, retrait si déjà présent).",
          adminOnly: true,
          params: [
            {
              name: "channel",
              description: "Salon texte où le message de sélection de rôles sera posté.",
              required: true,
            },
            {
              name: "title",
              description: "Titre affiché en haut de l'embed du message.",
              required: true,
            },
            {
              name: "role1",
              description: "Premier rôle à proposer (au moins un requis).",
              required: true,
            },
            {
              name: "role2 … role5",
              description: "Rôles supplémentaires à proposer (jusqu'à 5 au total).",
              required: false,
            },
            {
              name: "description",
              description: "Texte affiché sous le titre dans l'embed. Supporte \\n pour les sauts de ligne.",
              required: false,
            },
            {
              name: "color",
              description: "Couleur de la barre latérale de l'embed en hexadécimal — ex : #ff4655. Défaut : #5865f2.",
              required: false,
            },
          ],
          note: "La réponse de confirmation est éphémère (visible uniquement par toi). Le message posté dans le salon est permanent et continue de fonctionner même après un redémarrage du bot.",
        },
      ]} />
    </div>
  );
}
