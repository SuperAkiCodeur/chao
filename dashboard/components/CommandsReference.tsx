"use client";

import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";

export type CommandParam = { name: string; description: string; required: boolean; choices?: string[] };
export type BotCommand   = { name: string; description: string; params?: CommandParam[]; note?: string; adminOnly?: boolean };

const BD = "1px solid rgba(255,255,255,0.08)";

export function CommandsReference({ commands }: { commands: BotCommand[] }) {
  const [panelOpen, setPanelOpen] = useState(false);
  function togglePanel() { setPanelOpen(o => !o); }

  return (
    <div style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* Header */}
      <button type="button" onClick={togglePanel}
        style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.70)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Commandes Discord
          </span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>
            {commands.length} commande{commands.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.35)", transform: panelOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {/* Body — CSS Grid slide animation */}
      <div style={{
        display: "grid",
        gridTemplateRows: panelOpen ? "1fr" : "0fr",
        transition: "grid-template-rows 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease",
        opacity: panelOpen ? 1 : 0,
        overflow: "hidden",
      }}>
        <div style={{ minHeight: 0 }}>
          <div style={{ borderTop: BD }}>
            {commands.map((cmd, i) => (
                <div
                  key={cmd.name}
                  style={{ padding: "14px 20px", borderTop: i > 0 ? BD : undefined, transition: "background 0.12s, transform 0.18s cubic-bezier(0.16,1,0.3,1)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; e.currentTarget.style.transform = "translateX(3px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}
                >

                  {/* Name + admin badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
                    <code style={{
                      fontSize: 13, fontFamily: "ui-monospace, monospace", fontWeight: 700,
                      color: "#fff", background: "rgba(255,255,255,0.08)",
                      padding: "3px 8px", borderRadius: 4,
                    }}>
                      {cmd.name}
                    </code>
                    {cmd.adminOnly && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: "#f59e0b",
                        background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.18)",
                        padding: "2px 7px", borderRadius: 99,
                      }}>
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.52)", lineHeight: 1.6 }}>
                    {cmd.description}
                  </p>

                  {/* Parameters */}
                  {cmd.params && cmd.params.length > 0 && (
                    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "2px solid rgba(255,255,255,0.09)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {cmd.params.map((p) => (
                        <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
                          <code style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", color: "#fff", flexShrink: 0, fontWeight: 600 }}>
                            {p.name}
                          </code>
                          <span style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: p.required ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.22)" }}>
                            {p.required ? "requis" : "optionnel"}
                          </span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                            {p.description}
                          </span>
                          {p.choices && (
                            <span style={{ display: "flex", gap: 3, flexWrap: "wrap", flexShrink: 0 }}>
                              {p.choices.map((c) => (
                                <code key={c} style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)", padding: "1px 5px", borderRadius: 4 }}>
                                  {c}
                                </code>
                              ))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Note */}
                  {cmd.note && (
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", fontStyle: "italic", marginTop: 9, lineHeight: 1.5 }}>
                      {cmd.note}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
