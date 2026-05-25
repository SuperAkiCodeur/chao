import { db } from "@/lib/db";
import { watchParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommandsReference } from "@/components/CommandsReference";
import { Clapperboard, Crosshair, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeWatches }] = await db
    .select({ total: count() })
    .from(watchParties)
    .where(eq(watchParties.status, "active"));

  const [{ total: totalValorant }] = await db
    .select({ total: count() })
    .from(valorantLinks);

  const recentWatches = await db
    .select()
    .from(watchParties)
    .orderBy(watchParties.viewingAt)
    .limit(6);

  return { activeWatches, totalValorant, recentWatches };
}

export default async function HomePage() {
  const { activeWatches, totalValorant, recentWatches } = await getStats();

  const stats = [
    {
      label: "Watch parties actives",
      value: String(activeWatches),
      sub: "diffusions en cours",
      icon: Clapperboard,
      color: "text-rose-600",
      bg: "bg-rose-600/10",
    },
    {
      label: "Comptes Valorant",
      value: String(totalValorant),
      sub: "joueurs enregistrés",
      icon: Crosshair,
      color: "text-red-600",
      bg: "bg-red-600/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up" style={{ animationDelay: "0ms" }}>
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
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

      {/* Utilitaires */}
      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <CommandsReference commands={[
          {
            name: "/roulette",
            description:
              "Tire au sort un membre parmi une sélection. La commande ouvre un sélecteur multi-membres natif Discord (visible uniquement par toi). Sélectionne 2 à 10 participants, valide — le bot anime la roulette en public puis révèle le gagnant avec un ping.",
            params: [
              {
                name: "(aucun paramètre)",
                description: "Un sélecteur de membres Discord s'ouvre directement après la commande. Choisis 2 à 10 participants via le picker natif, puis confirme.",
                required: false,
              },
            ],
            note: "La réponse est publique : tout le monde voit l'animation et le résultat dans le salon. Le gagnant reçoit un ping.",
          },
        ]} />
      </div>

      {/* Historique récent */}
      <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Watch parties récentes</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentWatches.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Aucune watch party pour l'instant.</p>
            ) : (
              recentWatches.map((wp) => (
                <div
                  key={wp.messageId}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${wp.status === "active" ? "bg-success" : "bg-border"}`} />
                    <span className="text-xs text-muted-foreground">{wp.viewingAt}</span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{wp.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">{wp.status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
