const DIV = "1px solid rgba(255,255,255,0.06)";

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
      {/* Header */}
      <div style={{ padding: "22px 28px", borderBottom: DIV, flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginTop: 5 }}>
            {description}
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

/* ── Stat card (réutilisable dans toutes les pages) ── */
export function StatCard({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div style={{ background: "#242424", borderRadius: 14, padding: "18px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.60)", marginTop: 8 }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

/* ── Section card wrapper ── */
export function SectionCard({
  title,
  badge,
  children,
}: {
  title?: string;
  badge?: string | number;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "#202020", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
      {title && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</p>
          {badge !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.07)", padding: "3px 10px", borderRadius: 99 }}>
              {badge}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: "0" }}>{children}</div>
    </div>
  );
}
