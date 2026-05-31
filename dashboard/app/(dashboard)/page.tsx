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

const LINE = "1px solid rgba(255,255,255,0.06)";
const pct  = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();
  const progress = pct(activeCinema, totalCinema);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Top bar — hauteur 60px = sidebar logo ── */}
      <div style={{
        height: 60, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 10,
        borderBottom: LINE,
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.22)", pointerEvents: "none" }} />
          <input
            readOnly
            placeholder="Rechercher…"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: LINE, borderRadius: 8, padding: "8px 12px 8px 32px", fontSize: 13, color: "rgba(255,255,255,0.40)", outline: "none" }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Stat pills */}
        {[
          { icon: "🎬", value: activeCinema,  label: "séances"  },
          { icon: "⚔️", value: totalValorant, label: "Valorant" },
        ].map(({ icon, value, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, background: "#242424", border: LINE, borderRadius: 99, padding: "6px 12px" }}>
            <span style={{ fontSize: 12 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{value}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}

        {/* Avatar */}
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2A2A2A", border: LINE, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.70)", flexShrink: 0 }}>C</div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Hero ── */}
        <div style={{ borderRadius: 12, background: "#1F1F1F", padding: "28px 28px", display: "flex", alignItems: "stretch", gap: 16, flexShrink: 0 }}>
          {/* Text */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
            <div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginBottom: 10 }}>Bienvenue 👋</p>
              <h1 style={{ fontSize: "clamp(26px,2.4vw,36px)", fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.03em", marginBottom: 24 }}>
                {activeCinema > 0
                  ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""}<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                  : <>Bot Chao<br />est en ligne</>}
              </h1>
            </div>
            <a href="/cinema" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#000", fontWeight: 700, fontSize: 13, padding: "10px 18px", borderRadius: 8, textDecoration: "none", alignSelf: "flex-start" }}>
              Voir les séances ↗
            </a>
          </div>

          {/* Mini-cards */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexShrink: 0 }}>
            {[
              { n: "01", title: "Cinéma",   sub: `${activeCinema} actif${activeCinema !== 1 ? "s" : ""}`, bg: "#fff", fg: "#111", muted: "#888" },
              { n: "02", title: "Valorant", sub: `${totalValorant} comptes`,                               bg: "#fff", fg: "#111", muted: "#888" },
              { n: "03", title: "Steam",    sub: "Catalogue",                                              bg: "#111", fg: "#fff", muted: "rgba(255,255,255,0.30)" },
            ].map(({ n, title, sub, bg, fg, muted }) => (
              <div key={n} style={{ width: 120, borderRadius: 10, padding: "14px 14px", background: bg, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 150 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: muted, letterSpacing: "0.05em" }}>{n}</span>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: fg, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, flex: 1, minHeight: 0 }}>

          {/* Left — séances */}
          <div style={{ background: "#202020", borderRadius: 12, border: LINE, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: LINE, flexShrink: 0 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 4 }}>Total · {totalCinema} séances</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Séances cinéma</p>
              </div>
              {/* Progress bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "#fff", borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", minWidth: 28 }}>{progress}%</span>
              </div>
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {recentCinema.length === 0 ? (
                <p style={{ padding: "24px 20px", fontSize: 13, color: "rgba(255,255,255,0.20)" }}>Aucune séance pour l'instant.</p>
              ) : recentCinema.map((party) => (
                <div key={party.messageId} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: LINE }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {party.status === "active" ? "▶" : "✓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{party.title}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                      {party.viewingAt ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, flexShrink: 0, background: "rgba(255,255,255,0.07)", color: party.status === "active" ? "#fff" : "rgba(255,255,255,0.25)" }}>
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>

            {/* Stats */}
            <div style={{ background: "#202020", borderRadius: 12, border: LINE, padding: "16px 20px", overflow: "hidden" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Statistiques</p>
              {[
                { label: "Séances actives",  value: activeCinema,  sub: "en ce moment"  },
                { label: "Comptes Valorant", value: totalValorant, sub: "Discord liés"   },
                { label: "Disponibilité",    value: "100%",        sub: "aucune coupure" },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ background: "#2A2A2A", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.50)" }}>{label}</p>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>{sub}</span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ background: "#202020", borderRadius: 12, border: LINE, padding: "16px 20px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Accès rapide</p>
              {[
                { href: "/membres",    label: "Membres",    sub: "Gérer les membres", icon: "👥" },
                { href: "/logs",       label: "Logs",       sub: "Voir l'historique", icon: "📋" },
                { href: "/parametres", label: "Paramètres", sub: "Config du bot",     icon: "⚙️" },
              ].map(({ href, label, sub, icon }, i) => (
                <a key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? LINE : undefined }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{sub}</p>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 16 }}>›</span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
