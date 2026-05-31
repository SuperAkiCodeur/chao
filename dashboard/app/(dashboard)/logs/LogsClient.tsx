"use client";

import { useState, useTransition } from "react";
import { X } from "@phosphor-icons/react";
import { deleteLog } from "./actions";

const LINE = "1px solid rgba(255,255,255,0.08)";

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cinema:     { label: "Cinéma",     color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  valorant:   { label: "Valorant",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  member:     { label: "Membre",     color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  moderation: { label: "Modération", color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};

const FILTERS = [
  { id: "all",      label: "Tout",     types: null                     },
  { id: "discord",  label: "Discord",  types: ["member", "moderation"] },
  { id: "cinema",   label: "Cinéma",   types: ["cinema"]               },
  { id: "valorant", label: "Valorant", types: ["valorant"]             },
] as const;

type FilterId = typeof FILTERS[number]["id"];
type Log = { id: number; type: string; description: string; createdAt: string };

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return "à l'instant";
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function LogsClient({ logs: initialLogs }: { logs: Log[] }) {
  const [active, setActive]   = useState<FilterId>("all");
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [, startTransition]   = useTransition();

  const logs = initialLogs.filter((l) => !deleted.has(l.id));

  function handleDelete(id: number) {
    setDeleted((prev) => new Set([...prev, id]));
    startTransition(async () => {
      await deleteLog(id);
    });
  }

  const activeFilter = FILTERS.find((f) => f.id === active)!;
  const filtered = logs.filter((log) =>
    activeFilter.types === null || (activeFilter.types as readonly string[]).includes(log.type)
  );

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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Filter bar */}
      <div className="anim-fade-in d-0" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {FILTERS.map((f, i) => {
          const isActive = active === f.id;
          const count = f.types === null
            ? logs.length
            : logs.filter((l) => (f.types as readonly string[]).includes(l.type)).length;
          return (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className="anim-fade-up hover-glow"
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: "none", cursor: "pointer",
                background: isActive ? "#fff" : "rgba(255,255,255,0.06)",
                color: isActive ? "#000" : "rgba(255,255,255,0.50)",
                transition: "background 0.15s, color 0.15s, transform 0.2s",
                animationDelay: `${i * 50}ms`,
              }}
            >
              {f.label}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.55 }}>{count}</span>
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
          {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="anim-scale-in" style={{ background: "#202020", borderRadius: 12, border: LINE, padding: "32px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.30)" }}>Aucun événement pour ce filtre.</p>
        </div>
      )}

      {/* Groups */}
      {Array.from(groups.entries()).map(([day, entries], gi) => (
        <div key={day} className="anim-fade-up" style={{ display: "flex", flexDirection: "column", gap: 8, animationDelay: `${gi * 80}ms` }}>

          {/* Day separator */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{day}</span>
            <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Card */}
          <div style={{ background: "#202020", borderRadius: 12, border: LINE, overflow: "hidden" }}>
            {/* Card header */}
            <div style={{ padding: "11px 20px", borderBottom: LINE }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.50)" }}>
                {entries.length} événement{entries.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Rows */}
            <div>
              {entries.map((log, i) => {
                const cfg = TYPE_CONFIG[log.type] ?? { label: log.type, color: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.08)" };
                return (
                  <div
                    key={log.id}
                    style={{
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                      gap: 12, padding: "11px 20px",
                      borderTop: i > 0 ? LINE : undefined,
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      (e.currentTarget.querySelector(".log-del-btn") as HTMLElement | null)?.style.setProperty("opacity", "1");
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      (e.currentTarget.querySelector(".log-del-btn") as HTMLElement | null)?.style.setProperty("opacity", "0");
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0, flex: 1 }}>
                      {/* Type badge */}
                      <span style={{
                        fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
                        color: cfg.color, background: cfg.bg,
                        padding: "2px 8px", borderRadius: 99,
                      }}>
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{log.description}</span>
                    </div>

                    {/* Right: time + delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span
                        style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}
                        title={formatFull(log.createdAt)}
                      >
                        {formatRelative(log.createdAt)}
                      </span>
                      <button
                        className="log-del-btn"
                        onClick={() => handleDelete(log.id)}
                        title="Supprimer"
                        style={{
                          padding: 4, background: "none", border: "none", cursor: "pointer",
                          color: "rgba(255,255,255,0.30)", borderRadius: 5,
                          display: "flex", alignItems: "center",
                          opacity: 0, transition: "opacity 0.15s, color 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.30)"; }}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ))}

    </div>
  );
}
