import { db } from "@/lib/db";
import { watchParties, watchPartyUsers, watchPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clapperboard } from "lucide-react";
import { WatchClient } from "./WatchClient";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function getData() {
  const parties = await db
    .select()
    .from(watchParties)
    .orderBy(desc(watchParties.viewingAt))
    .limit(30);

  return Promise.all(
    parties.map(async (party) => {
      const [{ participants }] = await db
        .select({ participants: count() })
        .from(watchPartyUsers)
        .where(eq(watchPartyUsers.messageId, party.messageId));

      const [{ avgRating }] = await db
        .select({ avgRating: avg(watchPartyRatings.rating) })
        .from(watchPartyRatings)
        .where(eq(watchPartyRatings.messageId, party.messageId));

      return {
        messageId: party.messageId,
        title: party.title,
        mediaType: party.mediaType,
        viewingAt: party.viewingAt,
        status: party.status,
        participants: Number(participants),
        avgRating: avgRating ? Number(avgRating).toFixed(1) : null,
      };
    }),
  );
}

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getDiscord() {
  const [chRes, roRes] = await Promise.all([
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
    fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, { headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store" }),
  ]);
  if (!chRes.ok) console.error("[watch] channels fetch failed", chRes.status, await chRes.text().catch(() => ""));
  if (!roRes.ok) console.error("[watch] roles fetch failed", roRes.status, await roRes.text().catch(() => ""));
  const channels: DiscordChannel[] = chRes.ok ? await chRes.json() : [];
  const roles: DiscordRole[] = roRes.ok ? await roRes.json() : [];
  return { channels, roles };
}

export default async function WatchPage() {
  const [parties, { channels, roles }, settings] = await Promise.all([getData(), getDiscord(), getAllSettings()]);
  const upcoming = parties.filter((p) => p.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Cinéma</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Séances programmées et historique des diffusions</p>
      </div>

      {/* Films programmés */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/10 shrink-0">
              <Clapperboard className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-sm font-medium text-foreground">Prochainement</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun film programmé.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((p) => {
                const date = new Date(p.viewingAt);
                return (
                  <div key={p.messageId} className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.mediaType === "movie" ? "Film" : "Série"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium text-foreground">
                        {date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">Séances</CardTitle>
        </CardHeader>
        <CardContent>
          <WatchClient parties={parties} />
        </CardContent>
      </Card>

      <FeatureSettings
        channels={channels}
        roles={roles}
        settings={settings}
        fields={[
          { key: "watch_channel_id", label: "Salon d'annonces", description: "Salon où les séances sont publiées", kind: "channel" },
          { key: "watch_spectator_role_id", label: "Rôle spectateur", description: "Rôle attribué aux participants", kind: "role" },
        ]}
      />

      <ApiAttribution
        name="The Movie Database (TMDB)"
        url="https://www.themoviedb.org/"
        description="métadonnées des films et séries"
      />
    </div>
  );
}
