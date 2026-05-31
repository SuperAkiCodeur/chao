"use client";

import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";

export type CommandParam = {
  name: string;
  description: string;
  required: boolean;
  choices?: string[];
};

export type BotCommand = {
  name: string;
  description: string;
  params?: CommandParam[];
  note?: string;
  adminOnly?: boolean;
};

const LINE  = "1px solid rgba(255,255,255,0.08)";
const LINE2 = "1px solid rgba(255,255,255,0.12)";

export function CommandsReference({ commands }: { commands: BotCommand[] }) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelAnimClass, setPanelAnimClass] = useState("");

  const panelOpen = panelVisible && panelAnimClass !== "animate-accordion-up";

  function togglePanel() {
    if (panelVisible) { setPanelAnimClass("animate-accordion-up"); }
    else { setPanelVisible(true); setPanelAnimClass("animate-accordion-down"); }
  }
  function onAnimEnd() {
    if (panelAnimClass === "animate-accordion-up") setPanelVisible(false);
    setPanelAnimClass("");
  }

  return (
    <div style={{ background: "#222", borderRadius: 12, border: LINE2, overflow: "hidden" }}>

      {/* Header */}
      <button type="button" onClick={togglePanel}
        style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={14} style={{ color: "rgba(255,255,255,0.50)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Commandes Discord
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginLeft: 2 }}>
            {commands.length} commande{commands.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.40)", transform: panelOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {/* Body */}
      {panelVisible && (
        <div className={panelAnimClass} onAnimationEnd={onAnimEnd}>
          <div className="min-h-0">
            <div style={{ borderTop: LINE }}>
              {commands.map((cmd, i) => (
                <div key={cmd.name} style={{ padding: "16px 20px", borderTop: i > 0 ? LINE : undefined }}>

                  {/* Name + admin badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <code style={{
                      fontSize: 12, fontFamily: "ui-monospace, monospace", fontWeight: 700,
                      color: "#fff", background: "rgba(255,255,255,0.08)",
                      padding: "3px 9px", borderRadius: 6,
                    }}>
                      {cmd.name}
                    </code>
                    {cmd.adminOnly && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#f59e0b",
                        background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)",
                        padding: "2px 8px", borderRadius: 99,
                      }}>
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    {cmd.description}
                  </p>

                  {/* Parameters */}
                  {cmd.params && cmd.params.length > 0 && (
                    <div style={{ marginTop: 10, paddingLeft: 14, borderLeft: "2px solid rgba(255,255,255,0.10)", display: "flex", flexDirection: "column", gap: 7 }}>
                      {cmd.params.map((p) => (
                        <div key={p.name} style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <code style={{ fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#fff", flexShrink: 0, fontWeight: 600 }}>
                            {p.name}
                          </code>
                          <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, color: p.required ? "rgba(239,68,68,0.75)" : "rgba(255,255,255,0.25)" }}>
                            {p.required ? "requis" : "optionnel"}
                          </span>
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", flex: 1, minWidth: 0, lineHeight: 1.5 }}>
                            {p.description}
                          </span>
                          {p.choices && (
                            <span style={{ display: "flex", gap: 4, flexWrap: "wrap", flexShrink: 0 }}>
                              {p.choices.map((c) => (
                                <code key={c} style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.50)", padding: "1px 6px", borderRadius: 4 }}>
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
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontStyle: "italic", marginTop: 10, lineHeight: 1.5 }}>
                      {cmd.note}
                    </p>
                  )}

                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
