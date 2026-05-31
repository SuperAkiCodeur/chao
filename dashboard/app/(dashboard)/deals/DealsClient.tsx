"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Trash, FloppyDisk, CaretDown, Hash, SpeakerHigh, ArrowRight, PencilSimple, Check } from "@phosphor-icons/react";
import { saveDealsNotifChannel, removeDealsGame, renameDeals } from "./actions";
import type { DiscordChannel } from "@/components/FeatureSettings";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

type Game = {
  id: number; steamAppId: number; title: string; headerImage: string | null;
  addedByName: string; isOnSale: number;
  lastKnownPriceEur: number | null; lastKnownDiscount: number | null;
};

function formatEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

// ── Dropdown stylisé ──────────────────────────────────────────────────────────

function ChannelSelect({ value, onChange, channels, placeholder = "Choisir un salon…" }: {
  value: string; onChange: (v: string) => void;
  channels: DiscordChannel[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);
  const selected        = channels.find((c) => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flex: 1 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 32, width: "100%", display: "flex", alignItems: "center", gap: 7,
          background: value ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
          border: value ? BDI : BD, borderRadius: 8,
          paddingLeft: 10, paddingRight: 8, fontSize: 13, cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        {selected ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            {selected.type === 2 || selected.type === 13
              ? <SpeakerHigh size={11} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              : <Hash        size={11} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>
              {selected.name}
            </span>
          </span>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "rgba(255,255,255,0.28)" }}>{placeholder}</span>
        )}
        <CaretDown size={11} style={{ color: "rgba(255,255,255,0.30)", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.25s ease" }} />
      </button>

      {open && (
        <div className="animate-expand-down" style={{
          position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 100,
          width: "max-content", minWidth: "100%", borderRadius: 10, border: BDI,
          background: "#2a2a2a", boxShadow: "0 12px 36px rgba(0,0,0,0.55)",
          maxHeight: 220, overflowY: "auto", padding: "4px 0",
          transformOrigin: "top",
        }}>
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            <span style={{ width: 11, height: 11, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>— Aucun —</span>
            {!value && <Check size={11} style={{ color: "#fff" }} />}
          </button>
          {channels.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>
              {c.type === 2 || c.type === 13
                ? <SpeakerHigh size={11} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                : <Hash        size={11} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>{c.name}</span>
              {value === c.id && <Check size={11} style={{ color: "#fff", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DealsClient ───────────────────────────────────────────────────────────────

export function DealsClient({ channelId, channelName, notifChannelId, listName, games, channels }: {
  channelId: string;
  channelName: string;
  notifChannelId: string | null;
  listName: string | null;
  games: Game[];
  channels: DiscordChannel[];
}) {
  const [notifVal, setNotifVal]       = useState(notifChannelId ?? "");
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [gamesOpen, setGamesOpen]     = useState(false);
  const [removing, setRemoving]       = useState<number | null>(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameVal, setNameVal]         = useState(listName ?? "");
  const [nameSaved, setNameSaved]     = useState(false);
  const [pending, startSave]          = useTransition();
  const [removePending, startRemove]  = useTransition();
  const [namePending, startNameSave]  = useTransition();

  const textChannels = channels.filter((c) => c.type !== 4).sort((a, b) => a.position - b.position);
  const onSaleCount  = games.filter((g) => g.isOnSale === 1).length;

  function handleSaveName() {
    startNameSave(async () => {
      const res = await renameDeals(channelId, nameVal);
      if (res.success) { setNameSaved(true); setNameEditing(false); setTimeout(() => setNameSaved(false), 2000); }
    });
  }

  function handleSave() {
    setError(null); setSaved(false);
    startSave(async () => {
      const res = await saveDealsNotifChannel(channelId, notifVal);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  function handleRemove(id: number) {
    setRemoving(id);
    startRemove(async () => { await removeDealsGame(id); setRemoving(null); });
  }

  return (
    <div className="card-glow anim-soft-up" style={{ background: "#202020", borderRadius: 12, border: BD, position: "relative", zIndex: 1 }}>

      {/* ── Ligne principale ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr auto auto",
        alignItems: "center", gap: 12, padding: "14px 20px",
      }}>

        {/* Nom (éditable) + salon source */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          {nameEditing ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setNameEditing(false); }}
                maxLength={50}
                style={{
                  fontSize: 18, fontWeight: 400, fontFamily: "var(--font-serif)",
                  color: "#fff", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.16)", borderRadius: 6,
                  padding: "2px 8px", outline: "none", minWidth: 0, flex: 1,
                }}
              />
              <button type="button" onClick={handleSaveName} disabled={namePending}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", display: "flex", padding: 4 }}>
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                fontSize: 20, fontWeight: 400, fontFamily: "var(--font-serif)",
                color: nameVal ? "#fff" : "rgba(255,255,255,0.28)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontStyle: nameVal ? "normal" : "italic",
              }}>
                {nameVal || "Sans nom"}
              </span>
              {nameSaved && <Check size={12} style={{ color: "#4ade80", flexShrink: 0 }} />}
              {onSaleCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>
                  🔥 {onSaleCount}
                </span>
              )}
              <button type="button" onClick={() => setNameEditing(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", display: "flex", padding: 2, flexShrink: 0 }}>
                <PencilSimple size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Flèche */}
        <ArrowRight size={13} style={{ color: "rgba(255,255,255,0.20)" }} />

        {/* Dropdown stylisé — salon de notifs */}
        <ChannelSelect
          value={notifVal}
          onChange={(v) => { setNotifVal(v); setSaved(false); }}
          channels={textChannels}
          placeholder="Salon de notifs…"
        />

        {/* Bouton save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: saved ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.08)",
            color: saved ? "#4ade80" : "#fff",
            border: `1px solid ${saved ? "rgba(74,222,128,0.22)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 8, padding: "0 12px", height: 32, fontSize: 12, fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
            transition: "background 0.2s, color 0.2s, border-color 0.2s",
          }}
        >
          <FloppyDisk size={12} />
          {pending ? "…" : saved ? "Sauvegardé" : "Sauvegarder"}
        </button>

        {/* Toggle jeux */}
        <button
          type="button"
          onClick={() => setGamesOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: "transparent", border: BD, borderRadius: 8,
            padding: "0 10px", height: 32, fontSize: 12,
            color: "rgba(255,255,255,0.40)", cursor: "pointer",
          }}
        >
          <span>{games.length} jeu{games.length !== 1 ? "x" : ""}</span>
          <CaretDown size={11} style={{ transform: gamesOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
        </button>
      </div>

      {error && <p style={{ padding: "0 20px 12px", fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}

      {/* ── Jeux ── */}
      {gamesOpen && (
        <div className="anim-soft-up" style={{ borderTop: BD }}>
          {games.length === 0 ? (
            <p style={{ padding: "14px 20px", fontSize: 13, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
              Aucun jeu — utilise <code>/deals</code> dans <strong>#{channelName}</strong> pour en ajouter.
            </p>
          ) : games.map((g, i) => {
            const priceStr = g.lastKnownPriceEur !== null
              ? g.isOnSale === 1
                ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
                : formatEur(g.lastKnownPriceEur)
              : "Prix non vérifié";

            return (
              <div
                key={g.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderTop: i > 0 ? BD : undefined, transition: "background 0.12s" }}
                onMouseEnter={(e) => {
                  (e.currentTarget.querySelector(".rm-btn") as HTMLElement | null)?.style.setProperty("opacity", "1");
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget.querySelector(".rm-btn") as HTMLElement | null)?.style.setProperty("opacity", "0");
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {g.headerImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.headerImage} alt={g.title} style={{ width: 56, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 34, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={`https://store.steampowered.com/app/${g.steamAppId}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 17, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.title}
                  </a>
                  <p style={{ fontSize: 12, color: g.isOnSale === 1 ? "#4ade80" : "rgba(255,255,255,0.38)", marginTop: 2 }}>
                    {priceStr}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>{g.addedByName}</span>
                <button className="rm-btn" type="button" onClick={() => handleRemove(g.id)}
                  disabled={removePending && removing === g.id}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", opacity: 0, transition: "opacity 0.15s, color 0.15s", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                  <Trash size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
