import { db } from "@/lib/db";
import { cinemaParties, valorantLinks } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [{ total: activeCinema }]  = await db.select({ total: count() }).from(cinemaParties).where(eq(cinemaParties.status, "active"));
  const [{ total: totalCinema }]   = await db.select({ total: count() }).from(cinemaParties);
  const [{ total: totalValorant }] = await db.select({ total: count() }).from(valorantLinks);
  const recentCinema = await db.select().from(cinemaParties).orderBy(cinemaParties.viewingAt).limit(6);
  return { activeCinema, totalCinema, totalValorant, recentCinema };
}

const BD  = "1px solid rgba(255,255,255,0.08)";
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();
  const progress = pct(activeCinema, totalCinema);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Top bar 60px ── */}
      <div className="anim-fade-in" style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 20px", gap: 10, borderBottom: BD }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input readOnly placeholder="Rechercher…" style={{ width: "100%", height: 34, background: "rgba(255,255,255,0.05)", border: BD, borderRadius: 8, paddingLeft: 30, paddingRight: 12, fontSize: 14, color: "rgba(255,255,255,0.40)", outline: "none" }} />
        </div>
        <div style={{ flex: 1 }} />
        {/* Pills */}
        {[
          { icon: "🎬", value: activeCinema,  label: "séances"  },
          { icon: "⚔️", value: totalValorant, label: "Valorant" },
        ].map(({ icon, value, label }) => (
          <div key={label} className="anim-scale-in hover-glow" style={{ display: "flex", alignItems: "center", gap: 6, background: "#242424", border: BD, borderRadius: 99, padding: "5px 12px" }}>
            <span style={{ fontSize: 12 }}>{icon}</span>
            <span style={{ fontSize: 19, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>{value}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>{label}</span>
          </div>
        ))}
        {/* Avatar */}
        <div className="hover-glow" style={{ width: 32, height: 32, borderRadius: "50%", background: "#2A2A2A", border: BD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.65)", flexShrink: 0, cursor: "pointer" }}>C</div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* ── Hero ── */}
        <div className="anim-fade-up d-50" style={{ borderRadius: 12, background: "#1F1F1F", border: BD, padding: "24px", display: "flex", alignItems: "stretch", gap: 14, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
            <div>
              <p className="anim-fade-in d-200" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Bienvenue 👋</p>
              <h1 className="anim-fade-up d-250" style={{ fontSize: "clamp(26px,2.6vw,40px)", fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", lineHeight: 1.15, letterSpacing: "0.01em", marginBottom: 20 }}>
                {activeCinema > 0
                  ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""}<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                  : <>Bot Chao<br />est en ligne</>}
              </h1>
            </div>
            <a href="/cinema" className="hover-glow" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", fontWeight: 600, fontSize: 14, padding: "9px 16px", borderRadius: 8, textDecoration: "none", alignSelf: "flex-start", transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s" }}>
              Voir les séances ↗
            </a>
          </div>
          {/* Mini-cards staggerées */}
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexShrink: 0 }}>
            {[
              { n: "01", title: "Cinéma",   sub: `${activeCinema} actif${activeCinema !== 1 ? "s" : ""}`, bg: "#fff", fg: "#111", muted: "#888", delay: 300 },
              { n: "02", title: "Valorant", sub: `${totalValorant} comptes`,                               bg: "#fff", fg: "#111", muted: "#888", delay: 380 },
              { n: "03", title: "Steam",    sub: "Catalogue",                                              bg: "#161616", fg: "#fff", muted: "rgba(255,255,255,0.28)", delay: 460 },
            ].map(({ n, title, sub, bg, fg, muted, delay }) => (
              <div key={n} className="anim-scale-in hover-lift" style={{ width: 110, borderRadius: 10, padding: "14px", background: bg, border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 140, animationDelay: `${delay}ms` }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: muted, letterSpacing: "0.05em" }}>{n}</span>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 400, color: fg, lineHeight: 1.2, fontFamily: "var(--font-serif)" }}>{title}</p>
                  <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns ── */}
        <div className="anim-fade-up d-150" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 10, flex: 1, minHeight: 0 }}>

          {/* Left — séances */}
          <div style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: BD, flexShrink: 0 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 3 }}>Total · {totalCinema} séances</p>
              <p style={{ fontSize: 18, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", marginBottom: 10 }}>Séances cinéma</p>
              {/* Progress bar animée */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    width: `${progress}%`, height: "100%", background: "#fff", borderRadius: 99,
                    transformOrigin: "left center",
                    animation: "scale-in-x 1.2s cubic-bezier(0.16,1,0.3,1) 600ms both",
                  }} />
                </div>
                <span style={{ fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-serif)", minWidth: 32 }}>{progress}%</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {recentCinema.length === 0 ? (
                <p style={{ padding: "20px", fontSize: 14, color: "rgba(255,255,255,0.20)" }}>Aucune séance pour l'instant.</p>
              ) : recentCinema.map((party, i) => (
                <div key={party.messageId} className="hover-slide" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: i < recentCinema.length - 1 ? BD : undefined, transition: "background 0.12s, transform 0.18s cubic-bezier(0.16,1,0.3,1)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    {party.status === "active" ? "▶" : "✓"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 400, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-serif)" }}>{party.title}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                      {party.viewingAt ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 99, flexShrink: 0, background: "rgba(255,255,255,0.07)", color: party.status === "active" ? "#fff" : "rgba(255,255,255,0.25)" }}>
                    {party.status === "active" ? "En cours" : "Terminé"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>

            {/* Stats */}
            <div className="anim-fade-up d-200" style={{ background: "#202020", borderRadius: 12, border: BD, padding: "14px 20px" }}>
              <p style={{ fontSize: 18, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", marginBottom: 12 }}>Statistiques</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "Séances actives",  value: activeCinema,  sub: "en ce moment",  delay: 300 },
                  { label: "Comptes Valorant", value: totalValorant, sub: "Discord liés",   delay: 380 },
                  { label: "Disponibilité",    value: "100%",        sub: "aucune coupure", delay: 460 },
                ].map(({ label, value, sub, delay }) => (
                  <div key={label} className="anim-fade-up hover-lift" style={{ background: "#282828", borderRadius: 8, padding: "10px 14px", animationDelay: `${delay}ms` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>{label}</p>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}>{sub}</span>
                    </div>
                    <p style={{ fontSize: 26, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", lineHeight: 1 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="anim-fade-up d-300" style={{ background: "#202020", borderRadius: 12, border: BD, padding: "14px 20px" }}>
              <p style={{ fontSize: 18, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", marginBottom: 10 }}>Accès rapide</p>
              {[
                { href: "/membres",    label: "Membres",    sub: "Gérer les membres", icon: "👥" },
                { href: "/logs",       label: "Logs",       sub: "Voir l'historique", icon: "📋" },
                { href: "/parametres", label: "Paramètres", sub: "Config du bot",     icon: "⚙️" },
              ].map(({ href, label, sub, icon }, i) => (
                <a key={href} href={href} className="hover-slide" style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 2 ? BD : undefined, textDecoration: "none", transition: "transform 0.18s cubic-bezier(0.16,1,0.3,1)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "#282828", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>{label}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>{sub}</p>
                  </div>
                  <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 15 }}>›</span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
