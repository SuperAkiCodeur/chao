import { db } from "@/lib/db";
import { cemantixGames, watchParties, valorantLinks } from "@/lib/schema";
import { eq, count, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Clapperboard, Crosshair, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  const [todayGame] = await db
    .select()
    .from(cemantixGames)
    .where(eq(cemantixGames.date, today));

  const [totalGames] = await db
    .select({ count: count() })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true));

  const [activeWatches] = await db
    .select({ count: count() })
    .from(watchParties)
    .where(eq(watchParties.status, "active"));

  const [totalValorant] = await db
    .select({ count: count() })
    .from(valorantLinks);

  const [topWinner] = await db
    .select({
      winnerName: cemantixGames.winnerName,
      wins: sql<number>`count(*)::integer`,
    })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true))
    .groupBy(cemantixGames.winnerId, cemantixGames.winnerName)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  return { todayGame, totalGames: totalGames.count, activeWatches: activeWatches.count, totalValorant: totalValorant.count, topWinner };
}

export default async function HomePage() {
  const { todayGame, totalGames, activeWatches, totalValorant, topWinner } = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble du bot Chao</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cémantix du jour</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {todayGame ? (
              <div className="space-y-1">
                <Badge variant={todayGame.isSolved ? "success" : "warning"}>
                  {todayGame.isSolved ? "Résolu" : "En cours"}
                </Badge>
                {todayGame.isSolved && todayGame.winnerName && (
                  <p className="text-xs text-muted-foreground">par {todayGame.winnerName}</p>
                )}
              </div>
            ) : (
              <Badge variant="outline">Pas encore démarré</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Parties Cémantix gagnées</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGames}</div>
            {topWinner?.winnerName && (
              <p className="text-xs text-muted-foreground">
                Meilleur : {topWinner.winnerName} ({topWinner.wins}🏆)
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Watch parties actives</CardTitle>
            <Clapperboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWatches}</div>
            <p className="text-xs text-muted-foreground">en ce moment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Comptes Valorant liés</CardTitle>
            <Crosshair className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValorant}</div>
            <p className="text-xs text-muted-foreground">joueurs enregistrés</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's game detail */}
      {todayGame && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partie Cémantix — aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{todayGame.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mot secret</span>
              <span className="font-mono font-medium">{todayGame.secretWord}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={todayGame.isSolved ? "success" : "warning"}>
                {todayGame.isSolved ? "Résolu" : "En cours"}
              </Badge>
            </div>
            {todayGame.isSolved && todayGame.winnerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gagnant</span>
                <span className="font-medium">{todayGame.winnerName}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
