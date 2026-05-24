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
    <div className="rounded-xl border border-border bg-card">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={togglePanel}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Commandes Discord
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-normal ml-1">
            {commands.length} commande{commands.length !== 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            panelOpen ? "rotate-180" : ""
          }`}
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
