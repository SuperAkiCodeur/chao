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

const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();
  const progress = pct(activeCinema, totalCinema);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <div style={{ flex: 1, position: "relative", maxWidth: 420 }}>
          <Search size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
          <input readOnly placeholder="Rechercher une séance, un membre…" style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "9px 14px 9px 36px", fontSize: 13, color: "rgba(255,255,255,0.45)", outline: "none" }} />
        </div>
        <div style={{ flex: 1 }} />
        {[
          { icon: "🎬", value: activeCinema,  label: "séances"  },
          { icon: "⚔️", value: totalValorant, label: "Valorant" },
        ].map(({ icon, value, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, background: "#242424", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 99, padding: "6px 14px" }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{value}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#2A2A2A", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>C</div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Hero ── */}
        <div style={{ borderRadius: 16, background: "#1F1F1F", padding: 30, display: "flex", alignItems: "stretch", gap: 20, flexShrink: 0 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.40)", marginBottom: 12 }}>Bienvenue 👋</p>
              <h1 style={{ fontSize: "clamp(28px,2.6vw,40px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 28 }}>
                {activeCinema > 0
                  ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""}<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                  : <>Bot Chao<br />est en ligne</>}
              </h1>
            </div>
            <a href="/cinema" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#000", fontWeight: 700, fontSize: 14, padding: "11px 20px", borderRadius: 10, textDecoration: "none", alignSelf: "flex-start" }}>
              Voir les séances <span style={{ fontSize: 16 }}>↗</span>
            </a>
          </div>

          {/* 3 mini-cards */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            {[
              { n: "01", title: "Cinéma",   sub: `${activeCinema} actif${activeCinema !== 1 ? "s" : ""}`, bg: "#fff", fg: "#111", sub2: "#999"  },
              { n: "02", title: "Valorant", sub: `${totalValorant} comptes`,                               bg: "#fff", fg: "#111", sub2: "#999"  },
              { n: "03", title: "Steam",    sub: "Catalogue",                                              bg: "#111", fg: "#fff", sub2: "rgba(255,255,255,0.35)" },
            ].map(({ n, title, sub, bg, fg, sub2 }) => (
              <div key={n} style={{ width: 130, borderRadius: 14, padding: 16, background: bg, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 160 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: fg === "#fff" ? "rgba(255,255,255,0.25)" : "#AAA", letterSpacing: "0.04em" }}>{n}</span>
                <div>
                  <p style={{ fontSize: 20, fontWeight: 800, color: fg, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: 11, color: sub2, marginTop: 5 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, flex: 1 }}>

          {/* Left — séances */}
          <div style={{ background: "#202020", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px 16px" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontWeight: 600, marginBottom: 4 }}>Total · {totalCinema} séances</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Séances cinéma</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "#fff", borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.40)", minWidth: 32 }}>{progress}%</span>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

            {recentCinema.length === 0 ? (
              <p style={{ padding: "32px 24px", fontSize: 13, color: "rgba(255,255,255,0.20)" }}>Aucune séance pour l'instant.</p>
            ) : recentCinema.map((party) => (
              <div key={party.messageId} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                  {party.status === "active" ? "▶" : "✓"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{party.title}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                    {party.viewingAt ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Date non définie"}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, flexShrink: 0, background: "rgba(255,255,255,0.07)", color: party.status === "active" ? "#fff" : "rgba(255,255,255,0.25)" }}>
                  {party.status === "active" ? "● En cours" : "Terminé"}
                </span>
              </div>
            ))}
          </div>

          {/* Right — stats & quick links */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#202020", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Statistiques</p>
                <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>Voir tout</a>
              </div>
              {[
                { label: "Séances actives",  value: activeCinema,  detail: "en ce moment"  },
                { label: "Comptes Valorant", value: totalValorant, detail: "Discord liés"   },
                { label: "Disponibilité",    value: "100%",        detail: "aucune coupure" },
              ].map(({ label, value, detail }) => (
                <div key={label} style={{ background: "#2A2A2A", borderRadius: 12, padding: "14px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{label}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)" }}>{detail}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "#202020", borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Accès rapide</p>
              {[
                { href: "/membres",    label: "Membres",    sub: "Gérer les membres", icon: "👥" },
                { href: "/logs",       label: "Logs",       sub: "Voir l'historique", icon: "📋" },
                { href: "/parametres", label: "Paramètres", sub: "Config du bot",     icon: "⚙️" },
              ].map(({ href, label, sub, icon }, i) => (
                <a key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2A2A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.70)" }}>{label}</p>
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
