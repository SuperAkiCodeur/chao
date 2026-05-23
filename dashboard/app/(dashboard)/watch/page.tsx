import { db } from "@/lib/db";
import { watchParties, watchPartyUsers, watchPartyRatings } from "@/lib/schema";
import { eq, desc, count, avg } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clapperboard, Users } from "lucide-react";

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

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function WatchPage() {
  const parties = await getData();
  const active = parties.filter((p) => p.status === "active");
  const ended = parties.filter((p) => p.status !== "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Watch parties</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Films et séries regardés ensemble</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-400/10">
                <Clapperboard className="h-4 w-4 text-pink-400" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{active.length}</p>
            <p className="text-xs text-muted-foreground mt-1">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clapperboard className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">{parties.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total parties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {parties.reduce((sum, p) => sum + Number(p.participants), 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Participations totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Active parties */}
      {active.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">En cours</CardTitle>
              <Badge variant="warning">{active.length} active{active.length > 1 ? "s" : ""}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {active.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                    <span className="text-sm font-medium text-foreground">{party.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {party.mediaType === "movie" ? "Film" : "Série"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDateTime(party.viewingAt)}</span>
                    <Badge variant="secondary">{party.participants} participant{Number(party.participants) !== 1 ? "s" : ""}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {ended.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune watch party terminée.</p>
          ) : (
            <div className="space-y-1">
              {ended.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-border shrink-0" />
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{formatDate(party.viewingAt)}</span>
                    <span className="text-sm font-medium text-foreground">{party.title}</span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {party.mediaType === "movie" ? "Film" : "Série"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground">{party.participants} 👥</span>
                    {party.avgRating && (
                      <Badge variant="secondary">⭐ {party.avgRating}/5</Badge>
                    )}
                    <Badge variant="muted">Terminée</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
