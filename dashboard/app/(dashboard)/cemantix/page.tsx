import { db } from "@/lib/db";
import { cemantixGames, cemantixTopGuesses } from "@/lib/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeatureSettings, type DiscordChannel, type DiscordRole } from "@/components/FeatureSettings";
import { ApiAttribution } from "@/components/ApiAttribution";
import { getAllSettings } from "@/lib/settings";
import { ClearHistoryButton } from "./ClearHistoryButton";

export const dynamic = "force-dynamic";

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

async function getDiscord() {
  const res = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
    headers: { Authorization: `Bot ${BOT_TOKEN}` }, cache: "no-store",
  });
  if (!res.ok) console.error("[cemantix] channels fetch failed", res.status, await res.text().catch(() => ""));
  const channels: DiscordChannel[] = res.ok ? await res.json() : [];
  return { channels, roles: [] as DiscordRole[] };
}

async function getData() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

  const [todayGame] = await db.select().from(cemantixGames).where(eq(cemantixGames.date, today));

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
    .select({ winnerName: cemantixGames.winnerName, wins: sql<number>`count(*)::integer` })
    .from(cemantixGames)
    .where(eq(cemantixGames.isSolved, true))
    .groupBy(cemantixGames.winnerId, cemantixGames.winnerName)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  return { todayGame, topGuesses, recentGames, leaderboard };
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function CemantixPage() {
  const [{ todayGame, topGuesses, recentGames, leaderboard }, { channels, roles }, settings] =
    await Promise.all([getData(), getDiscord(), getAllSettings()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Cémantix</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Parties quotidiennes de devinette sémantique</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Partie du jour */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Partie du jour</CardTitle>
              {todayGame ? (
                <Badge variant={todayGame.isSolved ? "success" : "warning"}>
                  {todayGame.isSolved ? "Résolu" : "En cours"}
                </Badge>
              ) : (
                <Badge variant="muted">Pas démarrée</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayGame ? (
              <>
                <div className="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Mot secret</span>
                  <span className="font-mono font-bold text-foreground">{todayGame.secretWord}</span>
                </div>
                {todayGame.winnerName && (
                  <div className="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gagnant</span>
                    <span className="text-sm font-medium text-foreground">🏆 {todayGame.winnerName}</span>
                  </div>
                )}
                {todayGame.solvedAt && (
                  <div className="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Résolu à</span>
                    <span className="text-sm text-foreground">
                      {new Date(todayGame.solvedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-2">Démarre à 10h00 heure de Paris.</p>
            )}
          </CardContent>
        </Card>

        {/* Classement général */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">Classement général</CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune victoire enregistrée.</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center text-sm">
                        {MEDALS[i] ?? <span className="text-xs text-muted-foreground font-medium">{i + 1}</span>}
                      </span>
                      <span className="text-sm font-medium text-foreground">{entry.winnerName}</span>
                    </div>
                    <Badge variant="secondary">
                      {entry.wins} victoire{entry.wins > 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top mots du jour */}
      {topGuesses.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Top {topGuesses.length} — {todayGame?.date}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {topGuesses.map((g, i) => {
                const pct = g.score;
                return (
                  <div key={g.word} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150">
                    <span className="w-5 text-center text-sm shrink-0">
                      {MEDALS[i] ?? <span className="text-xs text-muted-foreground">#{i + 1}</span>}
                    </span>
                    <span className="font-mono text-sm font-medium text-foreground w-24 truncate">{g.word}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">{g.score}/100</span>
                    <span className="text-xs text-muted-foreground w-20 truncate text-right">{g.userName}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground">Historique des parties</CardTitle>
            <ClearHistoryButton />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentGames.map((game) => (
              <div
                key={game.date}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${game.isSolved ? "bg-success" : "bg-border"}`} />
                  <span className="text-xs text-muted-foreground w-24">{game.date}</span>
                  <span className="font-mono text-sm font-medium text-foreground">{game.secretWord}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{game.winnerName ?? "—"}</span>
                  <Badge variant={game.isSolved ? "success" : "muted"}>
                    {game.isSolved ? "Résolu" : "Non résolu"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <FeatureSettings
        channels={channels}
        roles={roles}
        settings={settings}
        fields={[
          { key: "cemantix_channel_id", label: "Salon de jeu", description: "Salon où le bot démarre la partie quotidienne", kind: "channel" },
        ]}
      />

      <ApiAttribution
        name="Cohere"
        url="https://cohere.com/"
        description="modèle embed-multilingual-v3.0 pour le calcul de similarité sémantique"
      />
    </div>
  );
}
