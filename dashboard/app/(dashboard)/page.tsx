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

const LIME = "#C8FF47";

export default async function HomePage() {
  const { activeCinema, totalCinema, totalValorant, recentCinema } = await getStats();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top bar (style Toko header) ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        {/* Search */}
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.22)" }} />
          <input
            readOnly placeholder="Rechercher une séance, un membre…"
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
              padding: "10px 14px 10px 38px", fontSize: 13,
              color: "rgba(255,255,255,0.50)", outline: "none",
            }}
          />
        </div>
        {/* Pills (style XP / days Toko) */}
        {[
          { icon: "🎬", value: activeCinema,  label: "séances"  },
          { icon: "⚔️", value: totalValorant, label: "Valorant" },
        ].map(({ icon, value, label }) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 99, padding: "7px 16px",
          }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{value}</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        {/* Avatar / status */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: LIME,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, color: "#000",
          flexShrink: 0,
        }}>
          C
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Hero (style Toko hero card) ── */}
        <div style={{
          borderRadius: 16, background: "#1B2611",
          padding: "28px 28px", display: "flex", gap: 20, alignItems: "stretch",
          flexShrink: 0,
        }}>
          {/* Left text */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.40)", marginBottom: 10, fontWeight: 500 }}>
              Bienvenue 👋
            </p>
            <h1 style={{
              fontSize: "clamp(26px,2.8vw,38px)", fontWeight: 800,
              color: "#fff", lineHeight: 1.15, letterSpacing: "-0.03em",
              marginBottom: 24,
            }}>
              {activeCinema > 0
                ? <>{activeCinema} séance{activeCinema > 1 ? "s" : ""} cinéma<br />active{activeCinema > 1 ? "s" : ""} en ce moment</>
                : <>Bot Chao est<br />opérationnel</>}
            </h1>
            <a href="/cinema" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: LIME, color: "#000",
              fontWeight: 700, fontSize: 13,
              padding: "10px 18px", borderRadius: 10,
              textDecoration: "none",
            }}>
              Voir les séances →
            </a>
          </div>

          {/* Mini-cards (style Toko "01 Going shopping / 02 Around the world") */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            {[
              { n: "01", title: "Cinéma",   detail: `${activeCinema} actif${activeCinema !== 1 ? "s" : ""}`, lime: false },
              { n: "02", title: "Valorant", detail: `${totalValorant} comptes`,                               lime: true  },
              { n: "03", title: "Steam",    detail: "Catalogue",                                              lime: false },
            ].map(({ n, title, detail, lime }) => (
              <div key={n} style={{
                width: 120, borderRadius: 12, padding: "14px 14px",
                background: lime ? LIME : "rgba(255,255,255,0.08)",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: lime ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.30)" }}>{n}</span>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: lime ? "#000" : "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</p>
                  <p style={{ fontSize: 11, color: lime ? "rgba(0,0,0,0.50)" : "rgba(255,255,255,0.35)", marginTop: 4 }}>{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two columns (style Toko module list + schedule) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 16, flex: 1 }}>

          {/* Left — séances récentes (style Toko module list) */}
          <div style={{ borderRadius: 16, background: "#212121", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.28)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
                Total · {totalCinema}
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Séances cinéma</p>
            </div>

            {recentCinema.length === 0 ? (
              <p style={{ padding: "40px 22px", fontSize: 13, color: "rgba(255,255,255,0.18)" }}>Aucune séance pour l'instant.</p>
            ) : recentCinema.map((party, i) => (
              <div key={party.messageId} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "13px 22px",
                borderBottom: i < recentCinema.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
              }}>
                {/* Icon (style Toko lesson icon) */}
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(255,255,255,0.07)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>🎬</div>

                {/* Title + date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {party.title}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 2 }}>
                    {party.viewingAt
                      ? new Date(party.viewingAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                      : "Date non définie"}
                  </p>
                </div>

                {/* Status badge (style Toko "Group / Personal") */}
                <span style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 700,
                  padding: "4px 10px", borderRadius: 99,
                  background: party.status === "active" ? "rgba(200,255,71,0.12)" : "rgba(255,255,255,0.05)",
                  color: party.status === "active" ? LIME : "rgba(255,255,255,0.22)",
                  flexShrink: 0,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: party.status === "active" ? LIME : "rgba(255,255,255,0.18)", display: "inline-block" }} />
                  {party.status === "active" ? "En cours" : "Terminé"}
                </span>
              </div>
            ))}
          </div>

          {/* Right — scheduled / stats (style Toko "Scheduled" panel) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Stats (style Toko event cards) */}
            <div style={{ borderRadius: 16, background: "#212121", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Statistiques</p>
                <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", textDecoration: "none", fontWeight: 600 }}>Tout voir</a>
              </div>
              {[
                { label: "Séances actives",  value: activeCinema,  sub: "en ce moment" },
                { label: "Comptes Valorant", value: totalValorant, sub: "Discord liés"  },
                { label: "Disponibilité",    value: "100%",        sub: "uptime"        },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{
                  borderRadius: 12, background: "rgba(255,255,255,0.05)",
                  padding: "14px 16px", marginBottom: 8,
                }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{label}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{sub}</p>
                </div>
              ))}
            </div>

            {/* Quick links */}
            <div style={{ borderRadius: 16, background: "#212121", padding: "18px 20px" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Accès rapide</p>
              {[
                { href: "/membres",    label: "Membres",    icon: "👥" },
                { href: "/logs",       label: "Logs",       icon: "📋" },
                { href: "/parametres", label: "Paramètres", icon: "⚙️" },
              ].map(({ href, label, icon }) => (
                <a key={href} href={href} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  textDecoration: "none",
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
                    {icon}
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>{label}</span>
                  <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 18 }}>›</span>
                </a>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
