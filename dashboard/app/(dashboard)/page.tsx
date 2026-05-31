import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }]  = await db.select({ total: count() }).from(cinemaParties).where(eq(cinemaParties.status, "active"));
  const [{ total: totalCinema }]   = await db.select({ total: count() }).from(cinemaParties);
  const [{ total: totalValorant }] = await db.select({ total: count() }).from(valorantLinks);
  const recentCinema = await db.select().from(cinemaParties).orderBy(cinemaParties.viewingAt).limit(5);
  return { activeCinema, totalCinema, totalValorant, recentCinema };
}

const LIME = "#C8FF47";
const pct  = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();
  const progress = pct(activeCinema, totalCinema);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Top bar (like Toko header) ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
      }}>
        <div style={{ flex: 1, position: "relative", maxWidth: 420 }}>
          <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input readOnly placeholder="Rechercher une séance, un membre…" style={{
            width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "9px 14px 9px 36px", fontSize: 13,
            color: "rgba(255,255,255,0.45)", outline: "none",
          }} />
        </div>
        <div style={{ flex: 1 }} />
        {/* XP-style pill — séances */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#242424", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "6px 14px" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>🎬</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{activeCinema}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>séances</span>
        </div>
        {/* Days-style pill — valorant */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#242424", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "6px 14px" }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>⚔️</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{totalValorant}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>Valorant</span>
        </div>
        {/* Avatar */}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: LIME, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#000", flexShrink: 0 }}>C</div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Hero card (like Toko big banner) ── */}
        <div style={{
          borderRadius: 16, background: "#1F1F1F",
          padding: "30px 30px 30px", display: "flex", alignItems: "stretch", gap: 20, flexShrink: 0,
        }}>
          {/* Left text */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>Bienvenue 👋</p>
              <h1 style={{ fontSize: "clamp(28px,2.6vw,40px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 28 }}>
                {activeCinema > 0
                  ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""}<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                  : <>Bot Chao<br />est en ligne</>}
              </h1>
            </div>
            <a href="/cinema" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: LIME, color: "#000", fontWeight: 700, fontSize: 14,
              padding: "11px 20px", borderRadius: 10, textDecoration: "none", alignSelf: "flex-start",
            }}>
              Voir les séances <span style={{ fontSize: 16 }}>↗</span>
            </a>
          </div>

          {/* 3 mini-cards (like Toko "01 Going shopping / 02 Around the world / 03 Paris en ville") */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            {[
              { n: "01", title: "Cinéma",   sub: `${activeCinema} actif${activeCinema !== 1 ? "s" : ""}`, bg: "#fff",   color: "#111" },
              { n: "02", title: "Valorant", sub: `${totalValorant} comptes`,                               bg: LIME,     color: "#000" },
              { n: "03", title: "Steam",    sub: "Catalogue",                                              bg: "#111",   color: "#fff" },
            ].map(({ n, title, sub, bg, color }) => (
              <div key={n} style={{
                width: 130, borderRadius: 14, padding: "16px 16px",
                background: bg, display: "flex", flexDirection: "column", justifyContent: "space-between",
                minHeight: 160,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: bg === "#fff" ? "#AAA" : bg === "#111" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.40)", letterSpacing: "0.04em" }}>{n}</span>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: 11, color: bg === "#fff" ? "#999" : bg === "#111" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.50)", marginTop: 5 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns (like Toko module list + scheduled) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, flex: 1 }}>

          {/* Left — séances (like Toko "Module 6 / Work and office") */}
          <div style={{ background: "#202020", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Header with progress bar */}
            <div style={{ padding: "20px 24px 16px" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontWeight: 600, marginBottom: 4 }}>
                Total · {totalCinema} séances
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Séances cinéma</p>
              </div>
              {/* Progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: LIME, borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", minWidth: 32 }}>{progress}%</span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {/* List items (like Toko lesson rows) */}
            {recentCinema.length === 0 ? (
              <p style={{ padding: "32px 24px", fontSize: 13, color: "rgba(255,255,255,0.20)" }}>Aucune séance pour l'instant.</p>
            ) : (
              recentCinema.map((party) => (
                <div key={party.messageId} style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "14px 24px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  {/* Icon circle (like Toko lesson icon with checkmark) */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: party.status === "active" ? "rgba(200,255,71,0.12)" : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${party.status === "active" ? "rgba(200,255,71,0.30)" : "rgba(255,255,255,0.10)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>
                    {party.status === "active" ? "▶" : "✓"}
                  </div>

                  {/* Title + description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {party.title}
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
                      {party.viewingAt
                        ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "Date non définie"}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, flexShrink: 0,
                    background: party.status === "active" ? "rgba(200,255,71,0.12)" : "rgba(255,255,255,0.06)",
                    color: party.status === "active" ? LIME : "rgba(255,255,255,0.25)",
                  }}>
                    {party.status === "active" ? "● En cours" : "Terminé"}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Right — stats & quick links (like Toko "Scheduled") */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Stats cards (like Toko event cards) */}
            <div style={{ background: "#202020", borderRadius: 16, padding: "20px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Statistiques</p>
                <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", textDecoration: "none", fontWeight: 600 }}>Voir tout</a>
              </div>

              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 600, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>Aujourd'hui</p>

              {[
                { label: "Séances actives",  value: activeCinema,  detail: "en ce moment",  dot: LIME },
                { label: "Comptes Valorant", value: totalValorant, detail: "Discord liés",   dot: "rgba(255,255,255,0.30)" },
                { label: "Disponibilité",    value: "100%",        detail: "aucune coupure", dot: "rgba(255,255,255,0.30)" },
              ].map(({ label, value, detail, dot }) => (
                <div key={label} style={{
                  background: "#2A2A2A", borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{label}</p>
                    <span style={{ fontSize: 10, color: dot, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block" }} />
                      {detail}
                    </span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ background: "#202020", borderRadius: 16, padding: "20px 20px" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Accès rapide</p>
              {[
                { href: "/membres",    label: "Membres",    sub: "Gérer les membres",    icon: "👥" },
                { href: "/logs",       label: "Logs",       sub: "Voir l'historique",    icon: "📋" },
                { href: "/parametres", label: "Paramètres", sub: "Config du bot",        icon: "⚙️" },
              ].map(({ href, label, sub, icon }, i) => (
                <a key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                  textDecoration: "none",
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{sub}</p>
                  </div>
                  <span style={{ fontSize: 18, color: "rgba(255,255,255,0.15)" }}>›</span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
