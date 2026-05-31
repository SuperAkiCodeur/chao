import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }]  = await db.select({ total: count() }).from(cinemaParties).where(eq(cinemaParties.status, "active"));
  const [{ total: totalCinema }]   = await db.select({ total: count() }).from(cinemaParties);
  const [{ total: totalValorant }] = await db.select({ total: count() }).from(valorantLinks);
  const recentCinema = await db.select().from(cinemaParties).orderBy(cinemaParties.viewingAt).limit(6);
  return { activeCinema, totalCinema, totalValorant, recentCinema };
}

const LIME = "#C8FF47";
const DIV  = "1px solid rgba(255,255,255,0.07)";

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();

  const miniCards = [
    { n: "01", title: "Cinéma",   sub: `${activeCinema} actif${activeCinema > 1 ? "s" : ""}`, lime: false },
    { n: "02", title: "Valorant", sub: `${totalValorant} comptes`,                              lime: true  },
    { n: "03", title: "Steam",    sub: "Catalogue",                                             lime: false },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Top bar */}
      <TopBar activeCinema={activeCinema} totalValorant={totalValorant} />

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        {/* ── Hero card ── */}
        <div style={{ borderRadius: "16px", background: "#1E2410", padding: "32px 32px 32px 32px", marginBottom: "16px", display: "flex", gap: "24px", alignItems: "stretch", minHeight: "200px" }}>
          {/* Left text */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "12px", fontWeight: 500 }}>
              Bienvenue sur le dashboard 👋
            </p>
            <h2 style={{ fontSize: "clamp(28px, 3vw, 40px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "28px" }}>
              {activeCinema > 0
                ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""} cinéma<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                : <>Bot Chao<br />opérationnel</>}
            </h2>
            <a href="/cinema" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: LIME, color: "#000", fontWeight: 700, fontSize: "13px", padding: "10px 18px", borderRadius: "10px", textDecoration: "none" }}>
              Voir les séances →
            </a>
          </div>

          {/* Mini cards */}
          <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
            {miniCards.map(({ n, title, sub, lime }) => (
              <div
                key={n}
                style={{ width: "130px", borderRadius: "12px", padding: "16px", background: lime ? LIME : "rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: "10px", fontWeight: 700, color: lime ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{n}</span>
                <div>
                  <p style={{ fontSize: "18px", fontWeight: 800, color: lime ? "#000" : "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: "11px", color: lime ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.40)", marginTop: "4px" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>

          {/* Left — Séances récentes */}
          <div style={{ borderRadius: "16px", background: "#1C1C1C", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: DIV, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                  Total • {totalCinema}
                </p>
                <p style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Séances cinéma récentes</p>
              </div>
              <a href="/cinema" style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", textDecoration: "none", fontWeight: 600 }}>Voir tout</a>
            </div>

            {/* Rows */}
            {recentCinema.length === 0 ? (
              <p style={{ padding: "40px 24px", fontSize: "13px", color: "rgba(255,255,255,0.20)" }}>Aucune séance pour l'instant.</p>
            ) : (
              recentCinema.map((party, i) => (
                <div key={party.messageId} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 24px", borderBottom: i < recentCinema.length - 1 ? DIV : undefined }}>
                  {/* Icon placeholder */}
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: "16px" }}>🎬</span>
                  </div>
                  {/* Title + desc */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{party.title}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", marginTop: "2px" }}>
                      {party.viewingAt
                        ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                        : "Date non définie"}
                    </p>
                  </div>
                  {/* Status */}
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: party.status === "active" ? "#fff" : "rgba(255,255,255,0.25)", background: party.status === "active" ? "rgba(200,255,71,0.12)" : "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "99px" }}>
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: party.status === "active" ? LIME : "rgba(255,255,255,0.2)" }} />
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Right — Infos rapides */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* Stats card */}
            <div style={{ borderRadius: "16px", background: "#1C1C1C", padding: "20px 20px" }}>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Statistiques</p>
              {[
                { label: "Séances actives",  value: activeCinema,   emoji: "🎬" },
                { label: "Comptes Valorant", value: totalValorant,  emoji: "⚔️" },
                { label: "Disponibilité",    value: "100%",         emoji: "✅" },
              ].map(({ label, value, emoji }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: DIV }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "14px" }}>{emoji}</span>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{label}</span>
                  </div>
                  <span style={{ fontSize: "15px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Members card */}
            <div style={{ borderRadius: "16px", background: "#1C1C1C", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Accès rapide</p>
              </div>
              {[
                { href: "/membres",    label: "Membres",    emoji: "👥" },
                { href: "/logs",       label: "Logs",       emoji: "📋" },
                { href: "/parametres", label: "Paramètres", emoji: "⚙️" },
              ].map(({ href, label, emoji }) => (
                <a key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: DIV, textDecoration: "none" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                    {emoji}
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{label}</span>
                  <span style={{ marginLeft: "auto", fontSize: "16px", color: "rgba(255,255,255,0.20)" }}>→</span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
