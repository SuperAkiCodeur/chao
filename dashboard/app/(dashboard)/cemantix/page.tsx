import { db } from "@/lib/db";
import { cemantixGames, cemantixTopGuesses } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getData() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  const [todayGame] = await db
    .select()
    .from(cemantixGames)
    .where(eq(cemantixGames.date, today));

  const topGuesses = todayGame
    ? await db
        .select()
        .from(cemantixTopGuesses)
        .where(eq(cemantixTopGuesses.gameDate, today))
        .orderBy(desc(cemantixTopGuesses.score))
    : [];

  const recentGames = await db
    .select()
    .from(cemantixGames)
    .orderBy(desc(cemantixGames.date))
    .limit(10);

  const leaderboard = await db
    .select({
      winnerName: cemantixGames.winnerName,
      wins: sql<number>`count(*)::integer`,
    })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true))
    .groupBy(cemantixGames.winnerId, cemantixGames.winnerName)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return { todayGame, topGuesses, recentGames, leaderboard };
}

export default async function CemantixPage() {
  const { todayGame, topGuesses, recentGames, leaderboard } = await getData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cémantix</h1>
        <p className="text-muted-foreground">Suivi des parties quotidiennes</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Partie du jour */}
        <Card>
          <CardHeader>
            <CardTitle>Partie du jour</CardTitle>
            <CardDescription>{todayGame?.date ?? "Aucune partie démarrée"}</CardDescription>
          </CardHeader>
          <CardContent>
            {todayGame ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mot secret</span>
                  <span className="font-mono font-semibold">{todayGame.secretWord}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <Badge variant={todayGame.isSolved ? "success" : "warning"}>
                    {todayGame.isSolved ? "✅ Résolu" : "🟡 En cours"}
                  </Badge>
                </div>
                {todayGame.winnerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gagnant</span>
                    <span className="font-medium">🏆 {todayGame.winnerName}</span>
                  </div>
                )}
                {todayGame.solvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Résolu à</span>
                    <span>{new Date(todayGame.solvedAt).toLocaleTimeString("fr-FR")}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">La partie démarre à 10h00 (heure de Paris).</p>
            )}
          </CardContent>
        </Card>

        {/* Classement général */}
        <Card>
          <CardHeader>
            <CardTitle>Classement général</CardTitle>
            <CardDescription>Toutes les victoires</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune victoire enregistrée.</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-6 text-center">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <span className="font-medium">{entry.winnerName}</span>
                    </span>
                    <Badge variant="secondary">{entry.wins} victoire{entry.wins > 1 ? "s" : ""}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 du jour */}
      {topGuesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top {topGuesses.length} mots du jour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topGuesses.map((g, i) => (
                <div key={g.word} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-muted-foreground">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span className="font-mono font-medium">{g.word}</span>
                    <span className="text-xs text-muted-foreground">par {g.userName}</span>
                  </span>
                  <span className="font-semibold">{g.score}/100</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des parties</CardTitle>
          <CardDescription>10 dernières parties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentGames.map((game) => (
              <div key={game.date} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground">{game.date}</span>
                <span className="font-mono font-medium">{game.secretWord}</span>
                <span>{game.winnerName ?? "—"}</span>
                <Badge variant={game.isSolved ? "success" : "outline"}>
                  {game.isSolved ? "Résolu" : "Non résolu"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
