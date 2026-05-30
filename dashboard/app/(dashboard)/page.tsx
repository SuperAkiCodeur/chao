import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Clapperboard, Crosshair, Activity, TrendingUp, TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

const LIME = "#C8FF47";

async function getStats() {
  const [{ total: activeCinema }] = await db
    .select({ total: count() })
    .from(cinemaParties)
    .where(eq(cinemaParties.status, "active"));

  const [{ total: totalCinema }] = await db
    .select({ total: count() })
    .from(cinemaParties);

  const [{ total: totalValorant }] = await db
    .select({ total: count() })
    .from(valorantLinks);

  const recentCinema = await db
    .select()
    .from(cinemaParties)
    .orderBy(cinemaParties.viewingAt)
    .limit(8);

  return { activeCinema, totalCinema, totalValorant, recentCinema };
}

function StatCard({
  label, value, sub, icon: Icon, accent = false,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={accent
        ? { background: LIME }
        : { background: "#fff", border: "1px solid #EBEBEB" }
      }
    >
      <div className="flex items-center justify-between">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center"
          style={accent
            ? { background: "rgba(0,0,0,0.12)" }
            : { background: "#F3F3F3" }
          }
        >
          <Icon
            className="h-5 w-5"
            style={{ color: accent ? "#111111" : "#555" }}
          />
        </div>
        <span
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: accent ? "rgba(0,0,0,0.5)" : "#AAA" }}
        >
          <TrendingUp className="h-3 w-3" />
          Live
        </span>
      </div>
      <div>
        <p
          className="text-4xl font-bold tracking-tight leading-none"
          style={{ color: accent ? "#111111" : "#111111" }}
        >
          {value}
        </p>
        <p
          className="text-sm font-medium mt-2"
          style={{ color: accent ? "rgba(0,0,0,0.60)" : "#888" }}
        >
          {label}
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: accent ? "rgba(0,0,0,0.40)" : "#BBB" }}
        >
          {sub}
        </p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="p-8 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#BBB" }}>
            Tableau de bord
          </p>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vue d'ensemble</h1>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(200,255,71,0.15)", color: "#6B9900" }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: LIME }} />
            Bot en ligne
          </div>
          <button
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: LIME, color: "#111111" }}
          >
            + Nouveau
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          accent
          label="Séances cinéma actives"
          value={activeCinema}
          sub={`${totalCinema} séances au total`}
          icon={Clapperboard}
        />
        <StatCard
          label="Comptes Valorant"
          value={totalValorant}
          sub="Comptes Discord liés"
          icon={Crosshair}
        />
        <StatCard
          label="Disponibilité bot"
          value="100%"
          sub="Aucune interruption"
          icon={Activity}
        />
      </div>

      {/* ── Séances récentes ── */}
      <div className="rounded-2xl bg-white" style={{ border: "1px solid #EBEBEB" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Séances cinéma récentes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Historique des dernières sessions</p>
          </div>
          <TrendingUp className="h-4 w-4 text-gray-300" />
        </div>

        {recentCinema.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucune séance pour l'instant.</p>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-3 px-6 py-3" style={{ borderBottom: "1px solid #F5F5F5" }}>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Titre</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 text-right">Statut</span>
            </div>
            {/* Rows */}
            {recentCinema.map((party, i) => (
              <div
                key={party.messageId}
                className="grid grid-cols-3 items-center px-6 py-4 transition-colors hover:bg-gray-50"
                style={{ borderBottom: i < recentCinema.length - 1 ? "1px solid #F5F5F5" : undefined }}
              >
                <span className="text-sm font-medium text-gray-800 truncate pr-4">{party.title}</span>
                <span className="text-xs text-gray-400">
                  {party.viewingAt
                    ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
                <div className="flex justify-end">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
                    style={party.status === "active"
                      ? { background: "rgba(200,255,71,0.18)", color: "#5A8000" }
                      : { background: "#F5F5F5", color: "#AAAAAA" }
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: party.status === "active" ? LIME : "#DDD" }}
                    />
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
