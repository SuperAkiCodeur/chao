"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Trash2, ChevronDown, Search, Check, Settings, Save, Hash, Volume2 } from "lucide-react";
import { saveSteamConfig, removeSteamGame } from "./actions";
import type { DiscordChannel, DiscordRole } from "@/components/FeatureSettings";

export type SteamGame = {
  id: number;
  steamAppId: number;
  title: string;
  headerImage: string | null;
  addedByName: string | null;
  addedAt: string;
  lastKnownPriceEur: number | null;
  lastKnownDiscount: number | null;
  isOnSale: number;
  lastCheckedAt: string | null;
};

export type SteamConfigData = {
  notifChannelId: string | null;
  notifRoleId: string | null;
};

const LINE  = "1px solid rgba(255,255,255,0.08)";
const LINE2 = "1px solid rgba(255,255,255,0.12)";

function formatEur(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

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
  const [query, setQuery]         = useState("");
  const ref       = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected  = options.find((o) => o.id === value);
  const isVisible = open && animClass !== "animate-expand-up";
  const filtered  = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;

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
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: LINE }}>
              <Search size={13} style={{ color: "rgba(255,255,255,0.30)", flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && doClose()}
                placeholder="Rechercher…"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#fff" }}
              />
            </div>
            <div style={{ maxHeight: 210, overflowY: "auto", padding: "4px 0" }}>
              <button type="button" onClick={() => { onChange(""); doClose(); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                <span style={{ flex: 1, textAlign: "left" }}>— Aucun —</span>
                {!value && <Check size={13} style={{ color: "#fff" }} />}
              </button>
              {filtered.length === 0 ? (
                <p style={{ padding: "8px 12px", fontSize: 11, color: "rgba(255,255,255,0.30)", fontStyle: "italic" }}>Aucun résultat</p>
              ) : filtered.map((o) => (
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

// ── GamesList ─────────────────────────────────────────────────────────────────

function GamesList({ games }: { games: SteamGame[] }) {
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<number | null>(null);

  function handleRemove(id: number) {
    setRemoving(id);
    start(async () => { await removeSteamGame(id); setRemoving(null); });
  }

  if (games.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", padding: "8px 0" }}>
        Aucun jeu tracké. Utilise{" "}
        <code style={{ fontSize: 11, background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4 }}>
          /steam add
        </code>{" "}
        dans Discord.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {games.map((g) => {
        const priceStr = g.lastKnownPriceEur !== null
          ? g.isOnSale
            ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
            : formatEur(g.lastKnownPriceEur)
          : "Prix non vérifié";

        return (
          <div
            key={g.id}
            style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px", transition: "background 0.15s, transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s" }}
            onMouseEnter={(e) => {
              (e.currentTarget.querySelector(".remove-btn") as HTMLElement | null)?.style.setProperty("opacity", "1");
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.querySelector(".remove-btn") as HTMLElement | null)?.style.setProperty("opacity", "0");
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {g.headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.headerImage} alt={g.title} style={{ height: 34, width: 56, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ height: 34, width: 56, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={`https://store.steampowered.com/app/${g.steamAppId}`}
                target="_blank" rel="noreferrer"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {g.title}
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                {g.isOnSale === 1 && (
                  <span className="anim-pulse" style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "1px 6px", borderRadius: 99 }}>
                    PROMO
                  </span>
                )}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{priceStr}</span>
              </div>
            </div>
            {g.addedByName && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{g.addedByName}</span>
            )}
            <button
              className="remove-btn"
              type="button"
              onClick={() => handleRemove(g.id)}
              disabled={pending && removing === g.id}
              style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", borderRadius: 6, display: "flex", opacity: 0, transition: "opacity 0.15s, color 0.15s", flexShrink: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.30)")}
              title="Retirer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── SteamConfig ───────────────────────────────────────────────────────────────

function SteamConfig({ config, channels, roles }: {
  config: SteamConfigData; channels: DiscordChannel[]; roles: DiscordRole[];
}) {
  const [open, setOpen]     = useState(false);
  const [vals, setVals]     = useState({ notifChannelId: config.notifChannelId ?? "", notifRoleId: config.notifRoleId ?? "" });
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, start]    = useTransition();

  const categoryMap    = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));
  const channelOptions = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position)
    .map((c) => ({
      id: c.id, label: c.name,
      sub: c.parent_id ? (categoryMap.get(c.parent_id) ?? undefined) : undefined,
      icon: c.type === 2 || c.type === 13
        ? <Volume2 size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
        : <Hash    size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />,
    }));

  const roleOptions = roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, label: r.name, color: roleColor(r.color) }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null); setSaved(false);
    start(async () => {
      const res = await saveSteamConfig(fd);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  return (
    <div style={{ background: "#202020", borderRadius: 12, border: LINE }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.70)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Configuration</span>
        </div>
        <ChevronDown size={13} style={{ color: "rgba(255,255,255,0.35)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} style={{ borderTop: LINE }}>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Salon autorisé</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 4 }}>
                  Seul ce salon peut utiliser{" "}
                  <code style={{ fontSize: 10, background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>/steam</code>{" "}
                  et reçoit les alertes
                </p>
              </div>
              <SelectDropdown name="notifChannelId" options={channelOptions} value={vals.notifChannelId} onChange={(v) => setVals((p) => ({ ...p, notifChannelId: v }))} placeholder="Choisir un salon…" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Rôle autorisé</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 4 }}>Seul ce rôle peut utiliser la commande et reçoit les pings promo</p>
              </div>
              <SelectDropdown name="notifRoleId" options={roleOptions} value={vals.notifRoleId} onChange={(v) => setVals((p) => ({ ...p, notifRoleId: v }))} placeholder="Choisir un rôle…" />
            </div>
          </div>
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
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SteamClient({ games, config, channels, roles }: {
  games: SteamGame[]; config: SteamConfigData; channels: DiscordChannel[]; roles: DiscordRole[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <GamesList games={games} />
      <SteamConfig config={config} channels={channels} roles={roles} />
    </div>
  );
}
