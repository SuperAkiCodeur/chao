"use client";

import { useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandsReference({ commands }: { commands: BotCommand[] }) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelAnimClass, setPanelAnimClass] = useState("");

  const panelOpen = panelVisible && panelAnimClass !== "animate-accordion-up";

  function togglePanel() {
    if (panelVisible) {
      setPanelAnimClass("animate-accordion-up");
    } else {
      setPanelVisible(true);
      setPanelAnimClass("animate-accordion-down");
    }
  }

  function handlePanelAnimEnd() {
    if (panelAnimClass === "animate-accordion-up") setPanelVisible(false);
    setPanelAnimClass("");
  }

  return (
    <div style={{ background: "#222", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
      {/* Header / toggle */}
      <button
        type="button"
        onClick={togglePanel}
        style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Terminal size={14} style={{ color: "rgba(255,255,255,0.55)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Commandes Discord
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500, marginLeft: 4 }}>
            {commands.length} commande{commands.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: "rgba(255,255,255,0.45)", transform: panelOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
        />
      </button>

      {/* Collapsible body */}
      {panelVisible && (
        <div className={panelAnimClass} onAnimationEnd={handlePanelAnimEnd}>
          <div className="min-h-0">
            <div className="border-t border-border divide-y divide-border/60">
              {commands.map((cmd) => (
                <div key={cmd.name} className="px-5 py-4 space-y-2">
                  {/* Command name + badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                      {cmd.name}
                    </code>
                    {cmd.adminOnly && (
                      <Badge variant="warning" className="text-[10px] py-0">
                        Admin
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cmd.description}
                  </p>

                  {/* Parameters */}
                  {cmd.params && cmd.params.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 pl-3 border-l-2 border-border">
                      {cmd.params.map((p) => (
                        <div key={p.name} className="flex items-baseline gap-2 flex-wrap">
                          <code className="text-[11px] font-mono text-primary shrink-0">
                            {p.name}
                          </code>
                          <span
                            className={`text-[10px] shrink-0 font-medium ${
                              p.required
                                ? "text-destructive/70"
                                : "text-muted-foreground/50"
                            }`}
                          >
                            {p.required ? "requis" : "optionnel"}
                          </span>
                          <span className="text-[11px] text-muted-foreground flex-1 min-w-0">
                            {p.description}
                          </span>
                          {p.choices && (
                            <span className="flex gap-1 flex-wrap shrink-0">
                              {p.choices.map((c) => (
                                <code
                                  key={c}
                                  className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-px rounded"
                                >
                                  {c}
                                </code>
                              ))}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional note */}
                  {cmd.note && (
                    <p className="text-[11px] text-muted-foreground/60 italic mt-1">
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
