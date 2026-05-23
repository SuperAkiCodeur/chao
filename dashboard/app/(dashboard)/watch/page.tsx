import { db } from "@/lib/db";
import { watchParties, watchPartyUsers, watchPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getData() {
  const parties = await db
    .select()
    .from(watchParties)
    .orderBy(desc(watchParties.viewingAt))
    .limit(20);

  const withStats = await Promise.all(
    parties.map(async (party) => {
      const [{ participants }] = await db
        .select({ participants: count() })
        .from(watchPartyUsers)
        .where(eq(watchPartyUsers.messageId, party.messageId));

      const [{ avgRating }] = await db
        .select({ avgRating: avg(watchPartyRatings.rating) })
        .from(watchPartyRatings)
        .where(eq(watchPartyRatings.messageId, party.messageId));

      return { ...party, participants, avgRating: avgRating ? Number(avgRating).toFixed(1) : null };
    }),
  );

  return withStats;
}

export default async function WatchPage() {
  const parties = await getData();
  const active = parties.filter((p) => p.status === "active");
  const ended = parties.filter((p) => p.status !== "active");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Watch parties</h1>
        <p className="text-muted-foreground">Films et séries regardés ensemble</p>
      </div>

      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">En cours</h2>
          {active.map((party) => (
            <Card key={party.messageId} className="border-yellow-500/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{party.title}</CardTitle>
                    <CardDescription>
                      {party.mediaType === "movie" ? "🎬 Film" : "📺 Série"} · {new Date(party.viewingAt).toLocaleString("fr-FR")}
                    </CardDescription>
                  </div>
                  <Badge variant="warning">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {party.participants} participant{party.participants !== 1 ? "s" : ""}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Historique</h2>
        {ended.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune watch party terminée.</p>
        ) : (
          <div className="space-y-3">
            {ended.map((party) => (
              <Card key={party.messageId}>
                <CardContent className="flex items-center justify-between py-4 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">{party.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {party.mediaType === "movie" ? "🎬" : "📺"} {new Date(party.viewingAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{party.participants} 👥</span>
                    {party.avgRating && (
                      <Badge variant="secondary">⭐ {party.avgRating}/5</Badge>
                    )}
                    <Badge variant="outline">Terminée</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
