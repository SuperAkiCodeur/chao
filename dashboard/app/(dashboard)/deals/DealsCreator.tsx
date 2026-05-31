"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { CaretDown, Check, Plus, Hash, SpeakerHigh } from "@phosphor-icons/react";
import { createDealsList } from "./actions";
import type { DiscordChannel } from "@/components/FeatureSettings";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

// ── Dropdown stylisé ──────────────────────────────────────────────────────────

function ChannelSelect({ value, onChange, channels, placeholder = "Choisir un salon…" }: {
  value: string; onChange: (v: string) => void;
  channels: DiscordChannel[]; placeholder?: string;
}) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const selected          = channels.find((c) => c.id === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 34, width: "100%", display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)", border: BDI, borderRadius: 8,
          paddingLeft: 10, paddingRight: 8, fontSize: 14, cursor: "pointer",
        }}
      >
        {selected ? (
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            {selected.type === 2 || selected.type === 13
              ? <SpeakerHigh size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              : <Hash        size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>
              {selected.name}
            </span>
          </span>
        ) : (
          <span style={{ flex: 1, textAlign: "left", color: "rgba(255,255,255,0.35)" }}>{placeholder}</span>
        )}
        <CaretDown size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="animate-expand-down" style={{
          position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 100,
          width: "100%", borderRadius: 10, border: BDI,
          background: "#2a2a2a", boxShadow: "0 12px 36px rgba(0,0,0,0.55)",
          maxHeight: 220, overflowY: "auto", padding: "4px 0",
          transformOrigin: "top",
        }}>
          <button type="button" onClick={() => { onChange(""); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            <span style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>— Aucun —</span>
            {!value && <Check size={12} style={{ color: "#fff" }} />}
          </button>
          {channels.map((c) => (
            <button key={c.id} type="button" onClick={() => { onChange(c.id); setOpen(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
              {c.type === 2 || c.type === 13
                ? <SpeakerHigh size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                : <Hash        size={12} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff" }}>{c.name}</span>
              {value === c.id && <Check size={12} style={{ color: "#fff", flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DealsCreator ──────────────────────────────────────────────────────────────

export function DealsCreator({ channels, usedChannelIds }: {
  channels: DiscordChannel[];
  usedChannelIds: string[];
}) {
  const [open, setOpen]         = useState(false);
  const [name, setName]         = useState("");
  const [channelId, setChannelId] = useState("");
  const [notifId, setNotifId]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [pending, start]        = useTransition();

  const textChannels = channels.filter((c) => c.type !== 4).sort((a, b) => a.position - b.position);
  const availableChannels = textChannels.filter((c) => !usedChannelIds.includes(c.id));

  function handleCreate() {
    if (!channelId) { setError("Choisis un salon source."); return; }
    setError(null);
    start(async () => {
      const res = await createDealsList({ channelId, name, notifChannelId: notifId || undefined });
      if (res.success) { setOpen(false); setName(""); setChannelId(""); setNotifId(""); }
      else setError(res.error);
    });
  }

  return (
    <div className="anim-soft-up" style={{ background: "#202020", borderRadius: 12, border: BD }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", background: "transparent", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Plus size={14} style={{ color: "rgba(255,255,255,0.55)" }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>
          Créer une liste
        </span>
        <CaretDown size={12} style={{ color: "rgba(255,255,255,0.25)", marginLeft: "auto", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {open && (
        <div className="anim-soft-up" style={{ borderTop: BD, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Nom */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Wishlist été, Jeux co-op…"
              maxLength={50}
              style={{
                height: 34, background: "rgba(255,255,255,0.05)", border: BDI,
                borderRadius: 8, padding: "0 12px", fontSize: 13, color: "#fff", outline: "none",
              }}
            />
          </div>

          {/* Salon source */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Salon source</label>
            <ChannelSelect
              value={channelId}
              onChange={setChannelId}
              channels={availableChannels}
              placeholder="Salon où /deals sera utilisé…"
            />
          </div>

          {/* Salon de notifs */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>Notifs <span style={{ fontWeight: 400, opacity: 0.5 }}>(optionnel)</span></label>
            <ChannelSelect
              value={notifId}
              onChange={setNotifId}
              channels={textChannels}
              placeholder="Salon des alertes promo…"
            />
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setOpen(false)}
              style={{ height: 34, padding: "0 16px", background: "none", border: BD, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>
              Annuler
            </button>
            <button type="button" onClick={handleCreate} disabled={pending}
              style={{
                height: 34, padding: "0 16px", display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
                cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
              }}>
              <Plus size={13} />
              {pending ? "Création…" : "Créer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
