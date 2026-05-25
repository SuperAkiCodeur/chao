"use client";

import { useState, useTransition } from "react";
import { Trash2, ChevronDown, Search, Check, Settings, Save, Hash, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveSteamConfig, removeSteamGame } from "./actions";
import type { DiscordChannel, DiscordRole } from "@/components/FeatureSettings";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEur(cents: number) {
  return `${(cents / 100).toFixed(2)} €`;
}

function roleColor(color: number) {
  return color === 0 ? "#4e5058" : `#${color.toString(16).padStart(6, "0")}`;
}

// ── Select dropdown ───────────────────────────────────────────────────────────

type Option = { id: string; label: string; sub?: string; color?: string; icon?: React.ReactNode };

function SelectDropdown({
  name, options, value, onChange, placeholder = "Sélectionner…",
}: {
  name: string; options: Option[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.id === value);
  const filtered = query ? options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sub ?? "").toLowerCase().includes(query.toLowerCase())
  ) : options;

  function close() { setOpen(false); setQuery(""); }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
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
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[220px] rounded-lg border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && close()}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
            </div>
            <div className="py-1 max-h-52 overflow-y-auto">
              {!query && (
                <button type="button" onClick={() => { onChange(""); close(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                  <span className="text-muted-foreground flex-1 text-left">— Aucun —</span>
                  {!value && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              )}
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">Aucun résultat</p>
              ) : filtered.map((o) => (
                <button key={o.id} type="button" onClick={() => { onChange(o.id); close(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                  {o.icon}
                  {o.color && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: o.color }} />}
                  <span className="flex-1 text-left truncate text-foreground" style={o.color ? { color: o.color } : {}}>{o.label}</span>
                  {o.sub && <span className="text-muted-foreground/50 text-xs shrink-0">{o.sub}</span>}
                  {value === o.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Liste des jeux ────────────────────────────────────────────────────────────

function GamesList({ games }: { games: SteamGame[] }) {
  const [pending, start] = useTransition();
  const [removing, setRemoving] = useState<number | null>(null);

  function handleRemove(id: number) {
    setRemoving(id);
    start(async () => { await removeSteamGame(id); setRemoving(null); });
  }

  if (games.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Aucun jeu tracké. Utilise <code className="text-xs bg-muted px-1 rounded">/steam add</code> dans Discord.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {games.map((g) => {
        const priceStr = g.lastKnownPriceEur !== null
          ? g.isOnSale
            ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
            : formatEur(g.lastKnownPriceEur)
          : "Prix non vérifié";

        return (
          <div key={g.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5 group">
            {g.headerImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.headerImage} alt={g.title} className="h-8 w-14 rounded object-cover shrink-0" />
            ) : (
              <div className="h-8 w-14 rounded bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a
                href={`https://store.steampowered.com/app/${g.steamAppId}`}
                target="_blank" rel="noreferrer"
                className="text-xs font-medium text-foreground hover:text-primary transition-colors truncate block"
              >
                {g.title}
              </a>
              <div className="flex items-center gap-2 mt-0.5">
                {g.isOnSale === 1 && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-600/10 px-1.5 py-0.5 rounded">PROMO</span>
                )}
                <span className="text-[11px] text-muted-foreground">{priceStr}</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground/50 shrink-0">{g.addedByName ?? ""}</span>
            <button
              type="button"
              onClick={() => handleRemove(g.id)}
              disabled={pending && removing === g.id}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              title="Retirer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Configuration ─────────────────────────────────────────────────────────────

function SteamConfig({
  config, channels, roles,
}: {
  config: SteamConfigData;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({
    notifChannelId: config.notifChannelId ?? "",
    notifRoleId:    config.notifRoleId    ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Catégories pour l'affichage
  const categoryMap = new Map(channels.filter((c) => c.type === 4).map((c) => [c.id, c.name]));

  const channelOptions: Option[] = channels
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
      const res = await saveSteamConfig(fd);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-border">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-xs font-medium text-foreground">Salon autorisé</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seul ce salon peut utiliser <code className="bg-muted px-0.5 rounded">/steam</code> et reçoit les alertes promo
                </p>
              </div>
              <SelectDropdown
                name="notifChannelId"
                options={channelOptions}
                value={vals.notifChannelId}
                onChange={(v) => setVals((p) => ({ ...p, notifChannelId: v }))}
                placeholder="Choisir un salon…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-xs font-medium text-foreground">Rôle autorisé</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seul ce rôle peut utiliser la commande et reçoit les pings promo
                </p>
              </div>
              <SelectDropdown
                name="notifRoleId"
                options={roleOptions}
                value={vals.notifRoleId}
                onChange={(v) => setVals((p) => ({ ...p, notifRoleId: v }))}
                placeholder="Choisir un rôle…"
              />
            </div>
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
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function SteamClient({
  games, config, channels, roles,
}: {
  games: SteamGame[];
  config: SteamConfigData;
  channels: DiscordChannel[];
  roles: DiscordRole[];
}) {
  return (
    <div className="space-y-4">
      <GamesList games={games} />
      <SteamConfig config={config} channels={channels} roles={roles} />
    </div>
  );
}
