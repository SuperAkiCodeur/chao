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

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleColor(color: number) {
  return color === 0 ? "#4e5058" : `#${color.toString(16).padStart(6, "0")}`;
}

// ── Select dropdown ───────────────────────────────────────────────────────────

type Option = { id: string; label: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({ name, options, value, onChange, placeholder = "Sélectionner…", searchPlaceholder = "Rechercher…" }: {
  name: string; options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string; searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = options.find((o) => o.id === value);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function handleOpen() {
    setOpen((o) => {
      if (!o) {
        // Reset search when opening
        setQuery("");
        setTimeout(() => searchRef.current?.focus(), 10);
      }
      return !o;
    });
  }

  function handleClose() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) handleClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={handleOpen}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-2.5 text-sm hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {selected ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              {selected.icon}
              {selected.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />}
              <span className="truncate text-foreground" style={selected.color ? { color: selected.color } : {}}>{selected.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[200px] rounded-lg border border-border bg-card shadow-xl">
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && handleClose()}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-muted-foreground/60 hover:text-foreground transition-colors text-xs">✕</button>
              )}
            </div>

            {/* Options list */}
            <div className="py-1 max-h-52 overflow-y-auto">
              {!query && (
                <button type="button" onClick={() => { onChange(""); handleClose(); }}
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
                  <button key={o.id} type="button" onClick={() => { onChange(o.id); handleClose(); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                    {o.icon}
                    {o.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                    <span className="flex-1 text-left truncate text-foreground" style={o.color ? { color: o.color } : {}}>{o.label}</span>
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
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 0=text 2=voice 5=announcement 13=stage 15=forum — exclude 4=category, 1/3=DM
  const textChannels: Option[] = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id,
      label: c.name,
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
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
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
              {saved && <p className="text-xs text-emerald-400">✓ Enregistré</p>}
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              <Save className="h-3.5 w-3.5" />
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
