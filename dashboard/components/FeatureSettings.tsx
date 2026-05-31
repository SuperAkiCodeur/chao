"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown, Save, Hash, Volume2, Settings, Search } from "lucide-react";
import { saveSection } from "@/app/(dashboard)/parametres/actions";
import type { ActionResult } from "@/app/(dashboard)/parametres/actions";

export type DiscordChannel = { id: string; name: string; type: number; position: number; parent_id: string | null };
export type DiscordRole    = { id: string; name: string; color: number; position: number };

export type SettingField = {
  key: string;
  label: string;
  description: string;
  kind: "channel" | "role";
};

function roleColor(color: number) {
  return color === 0 ? "#6b7280" : `#${color.toString(16).padStart(6, "0")}`;
}

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)"; // input / dropdown

// ── SelectDropdown ────────────────────────────────────────────────────────────
type Option = { id: string; label: string; sub?: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({
  name, options, value, onChange,
  placeholder = "Sélectionner…", searchPlaceholder = "Rechercher…",
}: {
  name: string; options: Option[]; value: string; onChange: (v: string) => void;
  placeholder?: string; searchPlaceholder?: string;
}) {
  const [open, setOpen]           = useState(false);
  const [animClass, setAnimClass] = useState("");
  const [query, setQuery]         = useState("");
  const ref       = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected  = options.find((o) => o.id === value);
  const isVisible = open && animClass !== "animate-expand-up";
  const filtered  = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function doOpen()  { setOpen(true);  setAnimClass("animate-expand-down"); setTimeout(() => searchRef.current?.focus(), 10); }
  function doClose() { if (!open) return; setAnimClass("animate-expand-up"); }
  function onAnimEnd() { if (animClass === "animate-expand-up") { setOpen(false); setQuery(""); } setAnimClass(""); }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) doClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div ref={ref} style={{ position: "relative" }}>

        {/* Trigger */}
        <button type="button" onClick={() => open ? doClose() : doOpen()}
          style={{
            height: 34, width: "100%", display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.05)", border: BDI, borderRadius: 8,
            paddingLeft: 10, paddingRight: 8, fontSize: 13, cursor: "pointer",
          }}
        >
          {selected ? (
            <span style={{ display: "flex", alignItems: "center", gap: 7, flex: 1, minWidth: 0 }}>
              {selected.icon}
              {selected.color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />}
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selected.color ?? "#fff" }}>
                {selected.label}
              </span>
              {selected.sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", flexShrink: 0 }}>· {selected.sub}</span>}
            </span>
          ) : (
            <span style={{ flex: 1, textAlign: "left", color: "rgba(255,255,255,0.35)" }}>{placeholder}</span>
          )}
          <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0, transform: isVisible ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className={animClass} onAnimationEnd={onAnimEnd}
            style={{
              position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 50,
              width: "100%", minWidth: 180, borderRadius: 12,
              border: BDI, background: "#2a2a2a", boxShadow: "0 12px 36px rgba(0,0,0,0.45)",
            }}
          >
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", borderBottom: BD }}>
              <Search size={12} style={{ color: "rgba(255,255,255,0.28)", flexShrink: 0 }} />
              <input ref={searchRef} type="text" value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && doClose()}
                placeholder={searchPlaceholder}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 12, color: "#fff" }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  style={{ color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>✕</button>
              )}
            </div>

            {/* Options */}
            <div style={{ maxHeight: 200, overflowY: "auto", padding: "3px 0" }}>
              {!query && (
                <button type="button" onClick={() => { onChange(""); doClose(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                  <span style={{ flex: 1, textAlign: "left" }}>— Aucun —</span>
                  {!value && <Check size={12} style={{ color: "#fff" }} />}
                </button>
              )}
              {options.length === 0 ? (
                <p style={{ padding: "7px 10px", fontSize: 11, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                  Aucun élément — vérifie DISCORD_BOT_TOKEN et DISCORD_GUILD_ID.
                </p>
              ) : filtered.length === 0 ? (
                <p style={{ padding: "7px 10px", fontSize: 11, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
                  Aucun résultat pour « {query} »
                </p>
              ) : filtered.map((o) => (
                <button key={o.id} type="button" onClick={() => { onChange(o.id); doClose(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                  {o.icon}
                  {o.color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.color, flexShrink: 0 }} />}
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: o.color ?? "#fff" }}>{o.label}</span>
                  {o.sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", flexShrink: 0 }}>{o.sub}</span>}
                  {value === o.id && <Check size={12} style={{ color: "#fff", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── FeatureSettings ───────────────────────────────────────────────────────────
export function FeatureSettings({ fields, channels, roles, settings }: {
  fields: SettingField[];
  channels: DiscordChannel[];
  roles: DiscordRole[];
  settings: Record<string, string>;
}) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelAnimClass, setPanelAnimClass] = useState("");
  const [vals, setVals] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const panelOpen = panelVisible && panelAnimClass !== "animate-accordion-up";

  function togglePanel() {
    if (panelVisible) { setPanelAnimClass("animate-accordion-up"); }
    else { setPanelVisible(true); setPanelAnimClass("animate-accordion-down"); }
  }
  function onPanelAnimEnd() {
    if (panelAnimClass === "animate-accordion-up") setPanelVisible(false);
    setPanelAnimClass("");
  }

  const categoryMap = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));

  const textChannels: Option[] = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id, label: c.name,
      sub: c.parent_id ? (categoryMap.get(c.parent_id) ?? undefined) : undefined,
      icon: c.type === 2 || c.type === 13
        ? <Volume2 size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
        : <Hash    size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />,
    }));

  const roleOptions: Option[] = roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, label: r.name, color: roleColor(r.color) }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null); setSaved(false);
    start(async () => {
      const res: ActionResult = await saveSection(fd);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  return (
    <div style={{ background: "#202020", borderRadius: 12, border: BD }}>

      {/* Header */}
      <button type="button" onClick={togglePanel}
        style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.70)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Configuration</span>
        </div>
        <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.35)", transform: panelOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {/* Collapsible body */}
      {panelVisible && (
        <div className={panelAnimClass} onAnimationEnd={onPanelAnimEnd}>
          <div className="min-h-0">
            <form onSubmit={handleSubmit} style={{ borderTop: BD }}>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                {fields.map((f) => (
                  <div key={f.key} style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "center" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1 }}>{f.label}</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 4, lineHeight: 1.4 }}>{f.description}</p>
                    </div>
                    <SelectDropdown
                      name={f.key}
                      options={f.kind === "channel" ? textChannels : roleOptions}
                      value={vals[f.key] ?? ""}
                      onChange={(v) => setVals((prev) => ({ ...prev, [f.key]: v }))}
                      placeholder={f.kind === "channel" ? "Choisir un salon…" : "Choisir un rôle…"}
                    />
                  </div>
                ))}
              </div>
              <div style={{ padding: "11px 20px", borderTop: BD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 12 }}>
                  {error && <span style={{ color: "#ef4444" }}>{error}</span>}
                  {saved && <span style={{ color: "#4ade80" }}>✓ Enregistré</span>}
                </div>
                <button type="submit" disabled={pending}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "#fff", color: "#000", border: "none", borderRadius: 8,
                    padding: "7px 14px", fontSize: 12, fontWeight: 600,
                    cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
                  }}
                >
                  <Save size={12} />
                  {pending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
