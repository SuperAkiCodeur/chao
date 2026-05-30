import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { CommandsReference } from "@/components/CommandsReference";
import { Clapperboard, Crosshair, Users, TrendingUp, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }] = await db
    .select({ total: count() })
    .from(cinemaParties)
    .where(eq(cinemaParties.status, "active"));

  const [{ total: totalValorant }] = await db
    .select({ total: count() })
    .from(valorantLinks);

  const recentCinema = await db
    .select()
    .from(cinemaParties)
    .orderBy(cinemaParties.viewingAt)
    .limit(6);

  return { activeCinema, totalValorant, recentCinema };
}

export default async function HomePage() {
  const { activeCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between animate-fade-up" style={{ animationDelay: "0ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Vue d'ensemble</h1>
          <p className="text-sm text-muted-foreground mt-1">Tableau de bord du bot Chao</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Bot en ligne
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "60ms" }}>

        {/* Cinéma actif */}
        <div className="rounded-2xl bg-sky-500 p-6 text-white shadow-lg shadow-sky-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Clapperboard className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-medium bg-white/20 rounded-full px-2.5 py-1">Actif</span>
          </div>
          <p className="text-4xl font-bold tracking-tight">{activeCinema}</p>
          <p className="text-sm text-sky-100 mt-1">Séances cinéma en cours</p>
        </div>

        {/* Valorant */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] border border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
              <Crosshair className="h-5 w-5 text-rose-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">Total</span>
          </div>
          <p className="text-4xl font-bold tracking-tight text-foreground">{totalValorant}</p>
          <p className="text-sm text-muted-foreground mt-1">Comptes Valorant liés</p>
        </div>

        {/* Bot status */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] border border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
              <Activity className="h-5 w-5 text-violet-500" />
            </div>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">En ligne</span>
          </div>
          <p className="text-4xl font-bold tracking-tight text-foreground">100%</p>
          <p className="text-sm text-muted-foreground mt-1">Disponibilité du bot</p>
        </div>

      </div>

      {/* ── Séances récentes + Commandes ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-up" style={{ animationDelay: "100ms" }}>

        {/* Séances récentes */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] border border-border/60">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground">Séances cinéma récentes</h2>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            {recentCinema.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune séance pour l'instant.</p>
            ) : (
              recentCinema.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${party.status === "active" ? "bg-sky-400" : "bg-border"}`} />
                    <span className="text-xs font-medium text-foreground truncate max-w-[160px]">{party.title}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    party.status === "active"
                      ? "text-sky-700 bg-sky-50"
                      : "text-muted-foreground bg-muted"
                  }`}>
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commandes */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.08)] border border-border/60">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Commandes disponibles</h2>
          </div>
          <CommandsReference commands={[
            {
              name: "/roulette",
              description: "Tire au sort un membre parmi une sélection de 2 à 10 participants. Le résultat est annoncé publiquement avec un ping.",
              params: [{ name: "(aucun paramètre)", description: "Un sélecteur de membres Discord s'ouvre directement.", required: false }],
            },
          ]} />
        </div>

      </div>
    </div>
  );
}
