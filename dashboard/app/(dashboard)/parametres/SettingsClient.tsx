"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Check, ChevronDown, Save, Hash, Volume2 } from "lucide-react";
import { saveSection } from "./actions";
import type { ActionResult } from "./actions";

export type DiscordChannel = { id: string; name: string; type: number; parent_id: string | null; position: number };
export type DiscordRole    = { id: string; name: string; color: number; position: number };

const LINE  = "1px solid rgba(255,255,255,0.08)";
const LINE2 = "1px solid rgba(255,255,255,0.12)";

function roleColor(color: number) {
  return color === 0 ? "#6b7280" : `#${color.toString(16).padStart(6, "0")}`;
}

// ── SelectDropdown ────────────────────────────────────────────────────────────

type Option = { id: string; label: string; sub?: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({
  name, options, value, onChange, placeholder = "Sélectionner…",
}: {
  name: string; options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen]           = useState(false);
  const [animClass, setAnimClass] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);
  const isVisible = open && animClass !== "animate-expand-up";

  function doOpen()  { setOpen(true);  setAnimClass("animate-expand-down"); }
  function doClose() { if (!open) return; setAnimClass("animate-expand-up"); }
  function onAnimEnd() { if (animClass === "animate-expand-up") setOpen(false); setAnimClass(""); }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) doClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div ref={ref} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => open ? doClose() : doOpen()}
          style={{
            height: 36, width: "100%", display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)", border: LINE2, borderRadius: 8,
            paddingLeft: 12, paddingRight: 10, fontSize: 13, cursor: "pointer",
          }}
        >
          {selected ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              {selected.icon}
              {selected.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color, flexShrink: 0 }} />}
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

        {open && (
          <div
            className={animClass}
            onAnimationEnd={onAnimEnd}
            style={{
              position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 50,
              width: "100%", minWidth: 200, borderRadius: 10,
              border: LINE2, background: "#2c2c2c", boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 0" }}>
              <button type="button" onClick={() => { onChange(""); doClose(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                <span style={{ flex: 1, textAlign: "left" }}>— Aucun —</span>
                {!value && <Check size={13} style={{ color: "#fff" }} />}
              </button>
              {options.map((o) => (
                <button key={o.id} type="button" onClick={() => { onChange(o.id); doClose(); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                  {o.icon}
                  {o.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.color, flexShrink: 0 }} />}
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: o.color ?? "#fff" }}>{o.label}</span>
                  {o.sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", flexShrink: 0 }}>{o.sub}</span>}
                  {value === o.id && <Check size={13} style={{ color: "#fff", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title, description, children,
}: {
  title: string; description: string; children: React.ReactNode;
}) {
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

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
    <div style={{ background: "#202020", borderRadius: 12, border: LINE, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: LINE }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{title}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>{description}</p>
      </div>
      {/* Fields */}
      <form onSubmit={handleSubmit}>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: LINE, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12 }}>
            {error && <span style={{ color: "#ef4444" }}>{error}</span>}
            {saved && <span style={{ color: "#4ade80" }}>✓ Enregistré</span>}
          </div>
          <button
            type="submit"
            disabled={pending}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#fff", color: "#000", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
            }}
          >
            <Save size={13} />
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1 }}>{label}</p>
        {description && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 4, lineHeight: 1.4 }}>{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsClient({ channels, roles, settings }: {
  channels: DiscordChannel[];
  roles: DiscordRole[];
  settings: Record<string, string>;
}) {
  const [vals, setVals] = useState<Record<string, string>>(settings);
  function set(key: string) { return (v: string) => setVals((prev) => ({ ...prev, [key]: v })); }

  const categoryMap  = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  const textChannels = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id, label: c.name,
      sub: c.parent_id ? (categoryMap.get(c.parent_id) ?? undefined) : undefined,
      icon: c.type === 2 || c.type === 13
        ? <Volume2 size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
        : <Hash    size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />,
    }));

  const sortedRoles = roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, label: r.name, color: roleColor(r.color) }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      <Section title="Cinéma" description="Salon d'annonces et rôle spectateur pour les séances cinéma">
        <Field label="Salon d'annonces" description="Salon où les séances sont publiées">
          <SelectDropdown name="cinema_channel_id" options={textChannels} value={vals["cinema_channel_id"] ?? ""} onChange={set("cinema_channel_id")} placeholder="Choisir un salon…" />
        </Field>
        <Field label="Rôle spectateur" description="Rôle attribué aux participants">
          <SelectDropdown name="cinema_spectator_role_id" options={sortedRoles} value={vals["cinema_spectator_role_id"] ?? ""} onChange={set("cinema_spectator_role_id")} placeholder="Choisir un rôle…" />
        </Field>
      </Section>

      <Section title="Membres" description="Rôle automatiquement attribué aux nouveaux membres">
        <Field label="Rôle automatique" description="Attribué dès qu'un membre rejoint le serveur">
          <SelectDropdown name="member_role_id" options={sortedRoles} value={vals["member_role_id"] ?? ""} onChange={set("member_role_id")} placeholder="Choisir un rôle…" />
        </Field>
      </Section>

      <Section title="Valorant" description="Salon pour les résultats et statistiques Valorant">
        <Field label="Salon Valorant" description="Salon où le bot poste les résultats">
          <SelectDropdown name="valorant_channel_id" options={textChannels} value={vals["valorant_channel_id"] ?? ""} onChange={set("valorant_channel_id")} placeholder="Choisir un salon…" />
        </Field>
      </Section>

    </div>
  );
}
