import { db } from "@/lib/db";
import { cemantixGames, watchParties, valorantLinks } from "@/lib/schema";
import { eq, count, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Clapperboard, Crosshair, Trophy, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  const [todayGame] = await db.select().from(cemantixGames).where(eq(cemantixGames.date, today));

  const [{ total: totalGames }] = await db
    .select({ total: count() })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true));

  const [{ total: activeWatches }] = await db
    .select({ total: count() })
    .from(watchParties)
    .where(eq(watchParties.status, "active"));

  const [{ total: totalValorant }] = await db
    .select({ total: count() })
    .from(valorantLinks);

  const [topWinner] = await db
    .select({ winnerName: cemantixGames.winnerName, wins: sql<number>`count(*)::integer` })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true))
    .groupBy(cemantixGames.winnerId, cemantixGames.winnerName)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const recentGames = await db
    .select()
    .from(cemantixGames)
    .orderBy(sql`date desc`)
    .limit(6);

  return { todayGame, totalGames, activeWatches, totalValorant, topWinner, recentGames };
}

export default async function HomePage() {
  const { todayGame, totalGames, activeWatches, totalValorant, topWinner, recentGames } =
    await getStats();

  const stats = [
    {
      label: "Parties gagnées",
      value: String(totalGames),
      sub: topWinner?.winnerName ? `Meilleur : ${topWinner.winnerName} (${topWinner.wins})` : "Aucune encore",
      icon: Trophy,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
    },
    {
      label: "Cémantix aujourd'hui",
      value: todayGame ? (todayGame.isSolved ? "Résolu" : "En cours") : "—",
      sub: todayGame?.winnerName ?? todayGame?.secretWord ?? "Démarre à 10h00",
      icon: Gamepad2,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Watch parties actives",
      value: String(activeWatches),
      sub: "diffusions en cours",
      icon: Clapperboard,
      color: "text-pink-400",
      bg: "bg-pink-400/10",
    },
    {
      label: "Comptes Valorant",
      value: String(totalValorant),
      sub: "joueurs enregistrés",
      icon: Crosshair,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue d'ensemble du bot Chao</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-lg border border-border">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Bot en ligne
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Partie du jour */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Cémantix — aujourd'hui</CardTitle>
              {todayGame && (
                <Badge variant={todayGame.isSolved ? "success" : "warning"}>
                  {todayGame.isSolved ? "Résolu" : "En cours"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayGame ? (
              <>
                <Row label="Mot secret" value={<span className="font-mono font-semibold">{todayGame.secretWord}</span>} />
                <Row label="Date" value={todayGame.date} />
                {todayGame.winnerName && <Row label="Gagnant" value={`🏆 ${todayGame.winnerName}`} />}
                {todayGame.solvedAt && (
                  <Row
                    label="Résolu à"
                    value={new Date(todayGame.solvedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  />
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">La partie démarre à 10h00 (heure de Paris).</p>
            )}
          </CardContent>
        </Card>

        {/* Historique récent */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Historique récent</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentGames.map((game) => (
              <div
                key={game.date}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${game.isSolved ? "bg-success" : "bg-border"}`} />
                  <span className="text-xs text-muted-foreground">{game.date}</span>
                  <span className="font-mono text-xs font-medium text-foreground">{game.secretWord}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {game.winnerName ?? "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}
