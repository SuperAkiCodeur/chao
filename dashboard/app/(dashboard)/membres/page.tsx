import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Clock } from "lucide-react";
import { MembresClient, type DiscordMember, type DiscordRole } from "./MembresClient";

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
  const [members, roles] = await Promise.all([getMembers(), getRoles()]);

  const timedOut = members.filter(
    (m) => m.communication_disabled_until && new Date(m.communication_disabled_until) > new Date(),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Membres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestion et modération des membres du serveur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400/10">
                <Clock className="h-4 w-4 text-yellow-400" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{timedOut.length}</p>
            <p className="text-xs text-muted-foreground mt-1">En sourdine</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">actuellement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                <Shield className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">3</p>
            <p className="text-xs text-muted-foreground mt-1">Actions dispo</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">sourdine · expulsion · ban</p>
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
    </div>
  );
}
