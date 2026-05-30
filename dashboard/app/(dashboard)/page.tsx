import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }] = await db.select({ total: count() }).from(cinemaParties).where(eq(cinemaParties.status, "active"));
  const [{ total: totalCinema }]  = await db.select({ total: count() }).from(cinemaParties);
  const [{ total: totalValorant }] = await db.select({ total: count() }).from(valorantLinks);
  const recentCinema = await db.select().from(cinemaParties).orderBy(cinemaParties.viewingAt).limit(10);
  return { activeCinema, totalCinema, totalValorant, recentCinema };
}

const DIV  = "1px solid rgba(255,255,255,0.07)";
const LIME = "#C8FF47";

const label = (text: string) => (
  <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.22)", marginBottom: "28px" }}>
    / {text}
  </p>
);

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();

  const stats = [
    { n: "01", value: String(activeCinema), title: "Séances actives",  sub: `${totalCinema} au total`   },
    { n: "02", value: String(totalValorant), title: "Comptes Valorant", sub: "Comptes Discord liés"      },
    { n: "03", value: "100%",               title: "Disponibilité",    sub: "Aucune interruption"       },
  ];

  return (
    <div style={{ minHeight: "100%", background: "#111111", color: "#fff" }}>

      {/* ── Header ── */}
      <div style={{ padding: "48px 52px 40px", borderBottom: DIV, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "16px" }}>
            / Dashboard
          </p>
          <h1 style={{ fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "#fff" }}>
            Vue d'ensemble
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "6px" }}>
          <span style={{ height: "6px", width: "6px", borderRadius: "50%", background: LIME, display: "inline-block" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)" }}>
            Bot en ligne
          </span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ padding: "48px 52px", borderBottom: DIV }}>
        {label("Statistiques")}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0" }}>
          {stats.map(({ n, value, title, sub }, i) => (
            <div
              key={n}
              style={{ paddingRight: i < 2 ? "40px" : 0, paddingLeft: i > 0 ? "40px" : 0, borderRight: i < 2 ? DIV : undefined }}
            >
              <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: LIME, marginBottom: "20px" }}>{n}</p>
              <p style={{ fontSize: "clamp(56px, 6vw, 80px)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", marginBottom: "16px" }}>
                {value}
              </p>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em" }}>{title}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "4px", letterSpacing: "0.02em" }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Séances récentes ── */}
      <div style={{ padding: "48px 52px" }}>
        {label("Séances cinéma récentes")}

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px", gap: "0", paddingBottom: "12px", borderBottom: DIV, marginBottom: "0" }}>
          {["#", "Titre", "Date", "Statut"].map(h => (
            <p key={h} style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)" }}>{h}</p>
          ))}
        </div>

        {recentCinema.length === 0 ? (
          <p style={{ padding: "48px 0", fontSize: "12px", color: "rgba(255,255,255,0.20)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Aucune séance pour l'instant.
          </p>
        ) : (
          recentCinema.map((party, i) => (
            <div
              key={party.messageId}
              style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px", gap: "0", alignItems: "center", padding: "18px 0", borderBottom: DIV, transition: "opacity 0.15s", cursor: "default" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.6")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 500, color: "#fff", letterSpacing: "0.01em", paddingRight: "24px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {party.title}
              </span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {party.viewingAt
                  ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).toUpperCase()
                  : "—"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: party.status === "active" ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.20)" }}>
                <span style={{ height: "5px", width: "5px", borderRadius: "50%", background: party.status === "active" ? LIME : "rgba(255,255,255,0.15)", flexShrink: 0 }} />
                {party.status === "active" ? "En cours" : "Terminé"}
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
