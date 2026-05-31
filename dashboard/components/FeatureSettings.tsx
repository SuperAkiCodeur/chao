"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown, Save, Hash, Volume2, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSection } from "@/app/(dashboard)/parametres/actions";
import type { ActionResult } from "@/app/(dashboard)/parametres/actions";

export type DiscordChannel = { id: string; name: string; type: number; position: number; parent_id: string | null };
export type DiscordRole = { id: string; name: string; color: number; position: number };

export type SettingField = {
  key: string;
  label: string;
  description: string;
  kind: "channel" | "role";
};

function roleColor(color: number) {
  return color === 0 ? "#4e5058" : `#${color.toString(16).padStart(6, "0")}`;
}

// ── Select dropdown ───────────────────────────────────────────────────────────

type Option = { id: string; label: string; sub?: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({ name, options, value, onChange, placeholder = "Sélectionner…", searchPlaceholder = "Rechercher…" }: {
  name: string; options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);
  const isOpening = animClass === "animate-expand-down";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function doOpen() {
    setVisible(true);
    setAnimClass("animate-expand-down");
    setTimeout(() => searchRef.current?.focus(), 10);
  }

  function doClose() {
    if (!visible) return;
    setAnimClass("animate-expand-up");
  }

  function handleAnimEnd() {
    if (animClass === "animate-expand-up") {
      setVisible(false);
      setQuery("");
    }
    setAnimClass("");
  }

  function handleToggle() {
    if (visible) doClose(); else doOpen();
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) doClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-2.5 text-sm hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {selected ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              {selected.icon}
              {selected.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
              <span className="truncate text-foreground" style={selected.color ? { color: selected.color } : {}}>{selected.label}</span>
              {selected.sub && <span className="text-muted-foreground/60 text-xs shrink-0">· {selected.sub}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 transition-transform duration-200 ${visible && isOpening || (visible && !animClass) ? "rotate-180" : ""}`} />
        </button>

        {visible && (
          <div
            className={`absolute left-0 top-full mt-1 z-50 w-full min-w-[200px] rounded-lg border border-border bg-card shadow-xl ${animClass}`}
            onAnimationEnd={handleAnimEnd}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && doClose()}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-muted-foreground/60 hover:text-foreground transition-colors text-xs">✕</button>
              )}
            </div>

            <div className="py-1 max-h-52 overflow-y-auto">
              {!query && (
                <button type="button" onClick={() => { onChange(""); doClose(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                  <span className="text-muted-foreground flex-1 text-left">— Aucun —</span>
                  {!value && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )}
              {options.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">
                  Aucun élément trouvé — vérifie que DISCORD_BOT_TOKEN et DISCORD_GUILD_ID sont configurés.
                </p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">Aucun résultat pour « {query} »</p>
              ) : (
                filtered.map((o) => (
                  <button key={o.id} type="button" onClick={() => { onChange(o.id); doClose(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                    {o.icon}
                    {o.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                    <span className="flex-1 text-left truncate text-foreground" style={o.color ? { color: o.color } : {}}>{o.label}</span>
                    {o.sub && <span className="text-muted-foreground/50 text-xs shrink-0">{o.sub}</span>}
                    {value === o.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
    if (panelVisible) {
      setPanelAnimClass("animate-accordion-up");
    } else {
      setPanelVisible(true);
      setPanelAnimClass("animate-accordion-down");
    }
  }

  function handlePanelAnimEnd() {
    if (panelAnimClass === "animate-accordion-up") {
      setPanelVisible(false);
    }
    setPanelAnimClass("");
  }

  const categoryMap = new Map(
    channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]),
  );

  const textChannels: Option[] = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.parent_id ? (categoryMap.get(c.parent_id) ?? undefined) : undefined,
      icon: c.type === 2 || c.type === 13
        ? <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        : <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />,
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
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={togglePanel}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} />
      </button>

      {panelVisible && (
        /* Wrapper de l'animation : grid-template-rows 0fr→1fr change la hauteur physique.
           overflow:hidden + display:grid sont dans la classe @utility et disparaissent
           après onAnimationEnd → les dropdowns internes ne sont plus clippés. */
        <div className={panelAnimClass} onAnimationEnd={handlePanelAnimEnd}>
          {/* min-h-0 requis : permet au grid item de se réduire à 0 hauteur */}
          <div className="min-h-0">
            <form onSubmit={handleSubmit} className="border-t border-border">
              <div className="p-5 space-y-4">
                {fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-2 gap-4 items-start">
                    <div>
                      <p className="text-xs font-medium text-foreground">{f.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
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
              <div className="px-5 pb-4 flex items-center justify-between border-t border-border pt-3">
                <div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  {saved && <p className="text-xs text-emerald-700">✓ Enregistré</p>}
                </div>
                <Button type="submit" size="sm" disabled={pending}>
                  <Save className="h-3.5 w-3.5" />
                  {pending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
