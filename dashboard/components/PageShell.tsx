const BD = "1px solid rgba(255,255,255,0.08)";

/* ── Page wrapper ── */
export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header — hauteur adaptée au grand titre */}
      <div className="anim-fade-in" style={{
        flexShrink: 0,
        display: "flex", alignItems: "flex-end",
        padding: "24px 28px 20px",
        borderBottom: BD,
      }}>
        <div>
          <h1 style={{ fontSize: "clamp(36px, 4vw, 56px)", fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", letterSpacing: "-0.01em", lineHeight: 1 }}>
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 8, lineHeight: 1, fontStyle: "italic", fontFamily: "var(--font-serif)" }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Contenu scrollable */}
      <div
        className="anim-fade-up d-50"
        style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          padding: "20px",
          display: "flex", flexDirection: "column", gap: 10,
        }}
      >
        {children}
      </div>

    </div>
  );
}

/* ── Stat card ── */
export function StatCard({
  value, label, sub, delay = 0,
}: {
  value: string | number; label: string; sub?: string; delay?: number;
}) {
  return (
    <div
      className="anim-scale-in hover-lift"
      style={{
        background: "#242424", borderRadius: 12, padding: "18px 20px", border: BD,
        animationDelay: `${delay}ms`,
      }}
    >
      <p style={{ fontSize: 34, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", letterSpacing: "0", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ── Section card ── */
export function SectionCard({
  title, badge, children, noPadding = false, delay = 0,
}: {
  title?: string;
  badge?: string | number;
  children: React.ReactNode;
  noPadding?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="anim-fade-up"
      style={{
        background: "#202020", borderRadius: 12, border: BD, overflow: "hidden",
        animationDelay: `${delay}ms`,
      }}
    >
      {title && (
        <div style={{
          padding: "14px 20px",
          borderBottom: BD,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{title}</p>
          {badge !== undefined && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: "rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.07)",
              padding: "3px 10px", borderRadius: 99,
            }}>
              {badge}
            </span>
          )}
        </div>
      )}
      <div style={noPadding ? undefined : { padding: "16px 20px" }}>
        {children}
      </div>
    </div>
  );
}
