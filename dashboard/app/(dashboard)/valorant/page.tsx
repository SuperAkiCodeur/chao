import { db } from "@/lib/db";
import { valorantLinks } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair } from "lucide-react";
import { ValorantClient } from "./ValorantClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const DEFAULT_GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getData() {
  return db.select().from(valorantLinks).orderBy(desc(valorantLinks.linkedAt));
}

async function getChannels(): Promise<DiscordChannel[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${DEFAULT_GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  if (!res.ok) console.error("[valorant] channels fetch failed", res.status, await res.text().catch(() => ""));
  return res.ok ? res.json() : [];
}

export default async function ValorantPage() {
  const [accounts, channels, settings] = await Promise.all([getData(), getChannels(), getAllSettings()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Valorant</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Comptes Riot liés aux membres Discord</p>
      </div>

      {/* Stat card */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/10">
                <Crosshair className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{accounts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Comptes liés</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">joueurs enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts list */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Comptes liés</CardTitle>
            <Badge variant="secondary">{accounts.length} compte{accounts.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ValorantClient accounts={accounts} defaultGuildId={DEFAULT_GUILD_ID} />
        </CardContent>
      </Card>

      <FeatureSettings
        channels={channels}
        roles={[] as DiscordRole[]}
        settings={settings}
        fields={[
          { key: "valorant_channel_id", label: "Salon Valorant", description: "Salon où le bot poste les résultats", kind: "channel" },
        ]}
      />

      <ApiAttribution
        name="HenrikDev API"
        url="https://henrikdev.xyz/"
        description="statistiques et résultats Valorant via l'API Riot Games"
      />
    </div>
  );
}
