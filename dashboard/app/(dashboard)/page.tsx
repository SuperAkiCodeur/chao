import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

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

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div className="h-full flex flex-col" style={{ background: "#ffffff" }}>

      {/* ── Header ── */}
      <div className="px-10 pt-10 pb-8 flex items-end justify-between" style={{ borderBottom: "1px solid #EBEBEB" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-2" style={{ color: "#BBBBBB" }}>
            Vue d'ensemble
          </p>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: "#111111", lineHeight: 1.1 }}>
            Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#C8FF47" }} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#AAAAAA" }}>
            Bot en ligne
          </span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3" style={{ borderBottom: "1px solid #EBEBEB" }}>
        {[
          { n: "01", value: activeCinema,   label: "Séances actives",   sub: `${totalCinema} au total`    },
          { n: "02", value: totalValorant,  label: "Comptes Valorant",  sub: "Comptes Discord liés"       },
          { n: "03", value: "100%",         label: "Disponibilité",     sub: "Aucune interruption"        },
        ].map(({ n, value, label, sub }, i) => (
          <div
            key={n}
            className="px-10 py-10"
            style={{ borderRight: i < 2 ? "1px solid #EBEBEB" : undefined }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: "#CCCCCC" }}>{n}</p>
            <p className="font-bold leading-none mb-3" style={{ fontSize: "clamp(48px, 5vw, 72px)", color: "#111111", letterSpacing: "-0.03em" }}>
              {value}
            </p>
            <p className="text-sm font-semibold" style={{ color: "#333333" }}>{label}</p>
            <p className="text-xs mt-0.5" style={{ color: "#BBBBBB" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Séances récentes ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-10 py-8 flex items-center justify-between" style={{ borderBottom: "1px solid #EBEBEB" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#BBBBBB" }}>
            Séances cinéma récentes
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#BBBBBB" }}>
            Statut
          </p>
        </div>

        {recentCinema.length === 0 ? (
          <p className="px-10 py-16 text-sm" style={{ color: "#CCCCCC" }}>Aucune séance pour l'instant.</p>
        ) : (
          recentCinema.map((party, i) => (
            <div
              key={party.messageId}
              className="px-10 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              style={{ borderBottom: "1px solid #F0F0F0" }}
            >
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-bold" style={{ color: "#DDDDDD", minWidth: "24px" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-semibold" style={{ color: "#111111" }}>{party.title}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs" style={{ color: "#CCCCCC" }}>
                  {party.viewingAt
                    ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                    : "—"}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: party.status === "active" ? "#333" : "#CCCCCC" }}>
                  <span className="h-1.5 w-1.5 rounded-full"
                    style={{ background: party.status === "active" ? "#C8FF47" : "#E0E0E0" }} />
                  {party.status === "active" ? "En cours" : "Terminé"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
