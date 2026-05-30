import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Clapperboard, Crosshair, Activity, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

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
  label, value, sub, icon: Icon, dark = false,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; dark?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-5"
      style={dark
        ? { background: "#111111" }
        : { background: "#ffffff", border: "1px solid #E8E8E8" }
      }
    >
      <div className="flex items-center justify-between">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={dark
            ? { background: "rgba(255,255,255,0.08)" }
            : { background: "#F3F3F3" }
          }
        >
          <Icon className="h-4 w-4" style={{ color: dark ? "#fff" : "#555" }} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: dark ? "rgba(255,255,255,0.25)" : "#CCC" }}>
          Live
        </span>
      </div>
      <div>
        <p className="text-4xl font-bold tracking-tight leading-none" style={{ color: dark ? "#ffffff" : "#111111" }}>
          {value}
        </p>
        <p className="text-sm font-medium mt-2" style={{ color: dark ? "rgba(255,255,255,0.50)" : "#888" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: dark ? "rgba(255,255,255,0.25)" : "#BBB" }}>
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#BBBBBB" }}>
            Tableau de bord
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#111111" }}>Vue d'ensemble</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Lime utilisé ici uniquement pour le dot "en ligne" */}
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "#F3F3F3", color: "#555" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#C8FF47" }} />
            Bot en ligne
          </div>
          <button
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-80"
            style={{ background: "#111111" }}
          >
            + Nouveau
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard dark label="Séances cinéma actives" value={activeCinema} sub={`${totalCinema} au total`} icon={Clapperboard} />
        <StatCard      label="Comptes Valorant"       value={totalValorant} sub="Comptes Discord liés"   icon={Crosshair}    />
        <StatCard      label="Disponibilité bot"      value="100%"          sub="Aucune interruption"    icon={Activity}     />
      </div>

      {/* ── Séances récentes ── */}
      <div className="rounded-2xl bg-white" style={{ border: "1px solid #E8E8E8" }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #F0F0F0" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#111" }}>Séances cinéma récentes</h2>
            <p className="text-xs mt-0.5" style={{ color: "#BBB" }}>Historique des dernières sessions</p>
          </div>
          <TrendingUp className="h-4 w-4" style={{ color: "#DDD" }} />
        </div>

        {recentCinema.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: "#CCC" }}>Aucune séance pour l'instant.</p>
        ) : (
          <div>
            <div className="grid grid-cols-3 px-6 py-3" style={{ borderBottom: "1px solid #F5F5F5" }}>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#CCC" }}>Titre</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#CCC" }}>Date</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-right" style={{ color: "#CCC" }}>Statut</span>
            </div>
            {recentCinema.map((party, i) => (
              <div
                key={party.messageId}
                className="grid grid-cols-3 items-center px-6 py-4 hover:bg-gray-50 transition-colors"
                style={{ borderBottom: i < recentCinema.length - 1 ? "1px solid #F5F5F5" : undefined }}
              >
                <span className="text-sm font-medium truncate pr-4" style={{ color: "#111" }}>{party.title}</span>
                <span className="text-xs" style={{ color: "#BBB" }}>
                  {party.viewingAt
                    ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
                <div className="flex justify-end">
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
                    style={party.status === "active"
                      ? { background: "#F5F5F5", color: "#333" }
                      : { background: "#F5F5F5", color: "#CCC" }
                    }
                  >
                    {/* Lime uniquement pour le dot "actif" */}
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: party.status === "active" ? "#C8FF47" : "#DDD" }}
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
