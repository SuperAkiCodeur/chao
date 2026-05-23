"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown, Save, Hash, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSection } from "./actions";
import type { ActionResult } from "./actions";

export type DiscordChannel = {
  id: string;
  name: string;
  type: number; // 0=text, 2=voice, 4=category, 5=announcement
  parent_id: string | null;
  position: number;
};

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleColor(color: number) {
  return color === 0 ? "#4e5058" : `#${color.toString(16).padStart(6, "0")}`;
}

function channelIcon(type: number) {
  if (type === 2) return <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  return <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

// ── Generic select dropdown ───────────────────────────────────────────────────

type SelectOption = { id: string; label: string; sub?: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({
  name,
  options,
  value,
  onChange,
  placeholder = "Sélectionner…",
}: {
  name: string;
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  function doOpen() { setVisible(true); setAnimClass("animate-expand-down"); }
  function doClose() { if (visible) setAnimClass("animate-expand-up"); }
  function handleAnimEnd() {
    if (animClass === "animate-expand-up") setVisible(false);
    setAnimClass("");
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) doClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => visible ? doClose() : doOpen()}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-muted/40 pl-3 pr-2.5 text-sm text-foreground hover:bg-muted/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {selected ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              {selected.icon}
              {selected.color && (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
              )}
              <span className="truncate" style={selected.color ? { color: selected.color } : {}}>
                {selected.label}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground flex-1 text-left">{placeholder}</span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 transition-transform duration-200 ${visible && animClass !== "animate-expand-up" ? "rotate-180" : ""}`} />
        </button>

        {visible && (
          <div
            className={`absolute left-0 top-full mt-1 z-50 w-full min-w-[220px] rounded-lg border border-border bg-card shadow-xl py-1 max-h-64 overflow-y-auto ${animClass}`}
            onAnimationEnd={handleAnimEnd}
          >
            <button
              type="button"
              onClick={() => { onChange(""); doClose(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            >
              <span className="text-muted-foreground flex-1 text-left">— Aucun —</span>
              {!value && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
            <div className="my-1 border-t border-border" />
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); doClose(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
              >
                {o.icon}
                {o.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                <span className="flex-1 text-left text-foreground truncate" style={o.color ? { color: o.color } : {}}>
                  {o.label}
                </span>
                {o.sub && <span className="text-xs text-muted-foreground shrink-0">{o.sub}</span>}
                {value === o.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  keys,
  currentValues,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  keys: string[];
  currentValues: Record<string, string>;
}) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    setSaved(false);
    start(async () => {
      const res: ActionResult = await saveSection(fd);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          {children}
        </div>
        <div className="px-5 pb-4 flex items-center justify-between">
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
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 items-start">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsClient({
  channels,
  roles,
  settings,
}: {
  channels: DiscordChannel[];
  roles: DiscordRole[];
  settings: Record<string, string>;
}) {
  // Local state for each setting value (controlled dropdowns)
  const [vals, setVals] = useState<Record<string, string>>(settings);
  function set(key: string) { return (v: string) => setVals((prev) => ({ ...prev, [key]: v })); }

  const textChannels = channels
    .filter((c) => c.type === 0 || c.type === 5)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({ id: c.id, label: c.name, icon: channelIcon(c.type) }));

  const sortedRoles = roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, label: r.name, color: roleColor(r.color) }));

  return (
    <div className="space-y-4">
      {/* Cinéma */}
      <Section
        title="🎬 Cinéma"
        description="Salon d'annonces et rôle spectateur pour les watch parties."
        keys={["watch_channel_id", "watch_spectator_role_id"]}
        currentValues={vals}
      >
        <Field label="Salon d'annonces" description="Salon où les séances sont publiées">
          <SelectDropdown
            name="watch_channel_id"
            options={textChannels}
            value={vals["watch_channel_id"] ?? ""}
            onChange={set("watch_channel_id")}
            placeholder="Choisir un salon…"
          />
        </Field>
        <Field label="Rôle spectateur" description="Rôle attribué aux participants">
          <SelectDropdown
            name="watch_spectator_role_id"
            options={sortedRoles}
            value={vals["watch_spectator_role_id"] ?? ""}
            onChange={set("watch_spectator_role_id")}
            placeholder="Choisir un rôle…"
          />
        </Field>
      </Section>

      {/* Membres */}
      <Section
        title="👥 Membres"
        description="Rôle automatiquement attribué aux nouveaux membres."
        keys={["member_role_id"]}
        currentValues={vals}
      >
        <Field label="Rôle automatique" description="Attribué dès qu'un membre rejoint">
          <SelectDropdown
            name="member_role_id"
            options={sortedRoles}
            value={vals["member_role_id"] ?? ""}
            onChange={set("member_role_id")}
            placeholder="Choisir un rôle…"
          />
        </Field>
      </Section>

      {/* Cémantix */}
      <Section
        title="🎮 Cémantix"
        description="Salon dédié au jeu de devinette quotidien."
        keys={["cemantix_channel_id"]}
        currentValues={vals}
      >
        <Field label="Salon de jeu" description="Salon où le bot démarre la partie">
          <SelectDropdown
            name="cemantix_channel_id"
            options={textChannels}
            value={vals["cemantix_channel_id"] ?? ""}
            onChange={set("cemantix_channel_id")}
            placeholder="Choisir un salon…"
          />
        </Field>
      </Section>

      {/* Valorant */}
      <Section
        title="🎯 Valorant"
        description="Salon pour les résultats et statistiques Valorant."
        keys={["valorant_channel_id"]}
        currentValues={vals}
      >
        <Field label="Salon Valorant" description="Salon où le bot poste les résultats">
          <SelectDropdown
            name="valorant_channel_id"
            options={textChannels}
            value={vals["valorant_channel_id"] ?? ""}
            onChange={set("valorant_channel_id")}
            placeholder="Choisir un salon…"
          />
        </Field>
      </Section>
    </div>
  );
}
