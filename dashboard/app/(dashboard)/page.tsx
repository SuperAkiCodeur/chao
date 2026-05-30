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

const glass = {
  background: "rgba(5, 20, 85, 0.48)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  boxShadow: "0 8px 32px rgba(0, 10, 60, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22)",
} as const;

const glassBlue = {
  ...glass,
  background: "rgba(0, 50, 170, 0.52)",
  border: "1px solid rgba(100, 180, 255, 0.28)",
} as const;

export default async function HomePage() {
  const { activeCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between animate-fade-up" style={{ animationDelay: "0ms" }}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-bold tracking-[0.32em] uppercase"
              style={{ color: "rgba(0,229,255,0.55)" }}
            >
              ★ DASHBOARD
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ textShadow: "0 2px 24px rgba(0,80,200,0.45)" }}
          >
            Vue d'ensemble
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(200, 230, 255, 0.88)" }}>
            Tableau de bord du bot Chao
          </p>
        </div>

        <div
          className="flex items-center gap-2 text-xs font-bold tracking-widest px-3 py-1.5 rounded-full"
          style={{
            color: "#00E5FF",
            background: "rgba(0, 229, 255, 0.10)",
            border: "1px solid rgba(0, 229, 255, 0.28)",
            boxShadow: "0 0 16px rgba(0, 229, 255, 0.15), inset 0 0 12px rgba(0, 229, 255, 0.05)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"
            style={{ boxShadow: "0 0 7px #00E5FF" }}
          />
          BOT EN LIGNE
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up"
        style={{ animationDelay: "60ms" }}
      >

        {/* Cinéma actif */}
        <div className="rounded-2xl p-6" style={glassBlue}>
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(0, 229, 255, 0.15)", border: "1px solid rgba(0,229,255,0.24)" }}
            >
              <Clapperboard className="h-5 w-5 text-cyan-300" />
            </div>
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ color: "rgba(180, 230, 255, 0.8)", background: "rgba(255,255,255,0.08)" }}
            >
              Actif
            </span>
          </div>
          <p
            className="text-4xl font-bold tracking-tight text-white"
            style={{ textShadow: "0 0 22px rgba(0,229,255,0.65)" }}
          >
            {activeCinema}
          </p>
          <p className="text-sm mt-1" style={{ color: "rgba(190, 225, 255, 0.88)" }}>
            Séances cinéma en cours
          </p>
        </div>

        {/* Valorant */}
        <div className="rounded-2xl p-6" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(255, 0, 144, 0.12)", border: "1px solid rgba(255,0,144,0.20)" }}
            >
              <Crosshair className="h-5 w-5" style={{ color: "#FF6EB4" }} />
            </div>
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{ color: "rgba(255, 190, 225, 0.8)", background: "rgba(255,0,144,0.08)" }}
            >
              Total
            </span>
          </div>
          <p
            className="text-4xl font-bold tracking-tight text-white"
            style={{ textShadow: "0 0 22px rgba(255,0,144,0.55)" }}
          >
            {totalValorant}
          </p>
          <p className="text-sm mt-1" style={{ color: "rgba(200, 225, 255, 0.88)" }}>
            Comptes Valorant liés
          </p>
        </div>

        {/* Bot status */}
        <div className="rounded-2xl p-6" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(0, 229, 255, 0.10)", border: "1px solid rgba(0,229,255,0.16)" }}
            >
              <Activity className="h-5 w-5 text-cyan-300" />
            </div>
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
              style={{
                color: "#00E5FF",
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.16)",
              }}
            >
              En ligne
            </span>
          </div>
          <p
            className="text-4xl font-bold tracking-tight text-white"
            style={{ textShadow: "0 0 22px rgba(0,229,255,0.55)" }}
          >
            100%
          </p>
          <p className="text-sm mt-1" style={{ color: "rgba(200, 225, 255, 0.88)" }}>
            Disponibilité du bot
          </p>
        </div>

      </div>

      {/* ── Séances récentes + Commandes ── */}
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-up"
        style={{ animationDelay: "100ms" }}
      >

        {/* Séances récentes */}
        <div className="rounded-2xl p-6" style={glass}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold tracking-widest uppercase text-white/90">
              Séances cinéma récentes
            </h2>
            <TrendingUp className="h-4 w-4" style={{ color: "rgba(180, 220, 255, 0.70)" }} />
          </div>
          <div className="space-y-1">
            {recentCinema.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: "rgba(180, 220, 255, 0.70)" }}>
                Aucune séance pour l'instant.
              </p>
            ) : (
              recentCinema.map((party) => (
                <div
                  key={party.messageId}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        background: party.status === "active" ? "#00E5FF" : "rgba(255,255,255,0.18)",
                        boxShadow: party.status === "active" ? "0 0 7px #00E5FF" : undefined,
                      }}
                    />
                    <span className="text-xs font-medium text-white/80 truncate max-w-[160px]">
                      {party.title}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
                    style={
                      party.status === "active"
                        ? { color: "#00E5FF", background: "rgba(0,229,255,0.10)", border: "1px solid rgba(0,229,255,0.20)" }
                        : { color: "rgba(200, 220, 255, 0.65)", background: "rgba(255,255,255,0.05)" }
                    }
                  >
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commandes */}
        <div className="rounded-2xl p-6" style={glass}>
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-4 w-4" style={{ color: "rgba(180, 220, 255, 0.70)" }} />
            <h2 className="text-sm font-bold tracking-widest uppercase text-white/90">
              Commandes disponibles
            </h2>
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
