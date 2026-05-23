"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "muted" | "destructive" }> = {
  cemantix:   { label: "Cémantix",   variant: "default" },
  watch:      { label: "Watch",      variant: "secondary" },
  valorant:   { label: "Valorant",   variant: "destructive" },
  member:     { label: "Membre",     variant: "success" },
  moderation: { label: "Modération", variant: "warning" },
};

const FILTERS = [
  { id: "all",      label: "Tout",     types: null                      },
  { id: "discord",  label: "Discord",  types: ["member", "moderation"]  },
  { id: "cemantix", label: "Cémantix", types: ["cemantix"]              },
  { id: "watch",    label: "Cinéma",   types: ["watch"]                 },
  { id: "valorant", label: "Valorant", types: ["valorant"]              },
] as const;

type FilterId = typeof FILTERS[number]["id"];

type Log = { id: number; type: string; description: string; createdAt: string };

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function LogsClient({ logs }: { logs: Log[] }) {
  const [active, setActive] = useState<FilterId>("all");

  const activeFilter = FILTERS.find((f) => f.id === active)!;

  const filtered = logs.filter((log) => {
    if (activeFilter.types === null) return true;
    return (activeFilter.types as readonly string[]).includes(log.type);
  });

  // Group by day
  const groups = new Map<string, Log[]>();
  for (const log of filtered) {
    const day = new Date(log.createdAt).toLocaleDateString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(log);
  }

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTERS.map((f) => {
          const isActive = active === f.id;
          const count = f.types === null
            ? logs.length
            : logs.filter((l) => (f.types as readonly string[]).includes(l.type)).length;
          return (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-[10px] ${isActive ? "opacity-60" : "opacity-40"}`}>
                {count}
              </span>
            </button>
          );
        })}
        <span className="ml-auto text-xs text-muted-foreground/60">
          {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Aucun événement pour ce filtre.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, entries]) => (
            <div key={day}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground capitalize">{day}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {entries.length} événement{entries.length > 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {entries.map((log) => {
                      const config = TYPE_CONFIG[log.type] ?? { label: log.type, variant: "muted" as const };
                      return (
                        <div
                          key={log.id}
                          className="flex items-start justify-between gap-4 rounded-lg px-3 py-2.5 hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <Badge variant={config.variant} className="shrink-0 mt-px">
                              {config.label}
                            </Badge>
                            <span className="text-sm text-foreground leading-snug">{log.description}</span>
                          </div>
                          <span
                            className="text-xs text-muted-foreground shrink-0 mt-0.5"
                            title={formatFull(log.createdAt)}
                          >
                            {formatRelative(log.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
