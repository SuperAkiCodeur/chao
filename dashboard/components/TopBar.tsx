import { Search } from "lucide-react";

const LIME = "#C8FF47";

export function TopBar({ activeCinema, totalValorant }: { activeCinema: number; totalValorant: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Search */}
      <div style={{ flex: 1, position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.25)", pointerEvents: "none" }} />
        <input
          placeholder="Rechercher une séance, un membre…"
          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px 14px 10px 38px", fontSize: "13px", color: "rgba(255,255,255,0.6)", outline: "none" }}
        />
      </div>

      {/* Stat pills */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "99px", padding: "7px 14px" }}>
          <span style={{ fontSize: "13px" }}>🎬</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{activeCinema}</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>séances</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "99px", padding: "7px 14px" }}>
          <span style={{ fontSize: "13px" }}>⚔️</span>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{totalValorant}</span>
          <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Valorant</span>
        </div>
      </div>

      {/* Online dot */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "99px", padding: "7px 14px" }}>
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: LIME, display: "inline-block" }} />
        <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>En ligne</span>
      </div>
    </div>
  );
}
