"use client";

import { useState, useTransition } from "react";
import { Plus, CaretDown, Clock } from "@phosphor-icons/react";
import { ChannelSelect } from "@/components/ChannelSelect";
import { createFeed } from "./actions";
import type { DiscordChannel } from "@/lib/discord";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

export function TimesPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  function toggle(h: number) {
    if (value.includes(h)) {
      if (value.length <= 1) return; // au moins 1
      onChange(value.filter((v) => v !== h));
    } else {
      onChange([...value, h].sort((a, b) => a - b));
    }
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {Array.from({ length: 24 }, (_, h) => (
        <button key={h} type="button" onClick={() => toggle(h)} style={{
          width: 38, height: 26, borderRadius: 6, fontSize: 11, fontWeight: value.includes(h) ? 700 : 400,
          color:       value.includes(h) ? "#38bdf8"                    : "rgba(255,255,255,0.32)",
          background:  value.includes(h) ? "rgba(56,189,248,0.15)"     : "rgba(255,255,255,0.04)",
          border:      value.includes(h) ? "1px solid rgba(56,189,248,0.40)" : BD,
          cursor: "pointer",
        }}>
          {h}h
        </button>
      ))}
      <span style={{ width: "100%", fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>
        {value.length} post{value.length > 1 ? "s" : ""}/jour · {value.map(h => `${h}h`).join(", ")}
      </span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "center" }}>
      <label style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

export function AddFeedForm({ channels }: { channels: DiscordChannel[] }) {
  const [open, setOpen]           = useState(false);
  const [name, setName]           = useState("");
  const [rssUrl, setRssUrl]       = useState("");
  const [channelId, setChannelId] = useState("");
  const [color, setColor]         = useState("#4ade80");
  const [postTimes, setPostTimes] = useState<number[]>([9]);
  const [error, setError]         = useState<string | null>(null);
  const [pending, start]          = useTransition();

  function handleCreate() {
    if (!name.trim() || !rssUrl.trim() || !channelId) {
      setError("Nom, URL RSS et salon sont requis."); return;
    }
    if (postTimes.length === 0) { setError("Au moins une heure requise."); return; }
    setError(null);
    start(async () => {
      const res = await createFeed({
        name, rssUrl, channelId,
        color: parseInt(color.replace("#", ""), 16),
        postTimes,
      });
      if (res.success) {
        setOpen(false);
        setName(""); setRssUrl(""); setChannelId(""); setColor("#4ade80"); setPostTimes([9]);
      } else {
        setError(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <div style={{ background: "#202020", borderRadius: 12, border: BD }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{
        width: "100%", background: "transparent", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10, padding: "14px 20px",
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Plus size={13} style={{ color: "rgba(255,255,255,0.45)" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.45)", flex: 1, textAlign: "left" }}>
          Ajouter un flux RSS
        </span>
        <CaretDown size={12} style={{
          color: "rgba(255,255,255,0.22)",
          transform: open ? "rotate(180deg)" : undefined,
          transition: "transform 0.15s ease",
        }} />
      </button>

      {open && (
        <div style={{ borderTop: BD, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Nom">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              style={{ height: 34, width: "100%", background: "rgba(255,255,255,0.05)",
                border: BDI, borderRadius: 8, padding: "0 12px", fontSize: 13, color: "#fff" }}
              placeholder="Ex : Palestine, Tech News, Sciences…" />
          </Row>
          <Row label="Salon">
            <ChannelSelect value={channelId} onChange={setChannelId}
              channels={channels.filter((c) => c.type !== 4)}
              placeholder="Salon où poster…" />
          </Row>
          <Row label="RSS URL">
            <input value={rssUrl} onChange={(e) => setRssUrl(e.target.value)}
              style={{ height: 34, width: "100%", background: "rgba(255,255,255,0.05)",
                border: BDI, borderRadius: 8, padding: "0 12px", fontSize: 13, color: "#fff" }}
              placeholder="https://example.com/feed/" />
          </Row>
          <Row label="Couleur">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ width: 36, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "none" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{color}</span>
            </div>
          </Row>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "flex-start" }}>
            <label style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, paddingTop: 6 }}>
              <Clock size={11} style={{ marginRight: 4 }} />Horaires
            </label>
            <TimesPicker value={postTimes} onChange={setPostTimes} />
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 2 }}>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} style={{
              height: 32, padding: "0 14px", background: "none", border: BD,
              borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.40)", cursor: "pointer" }}>
              Annuler
            </button>
            <button type="button" onClick={handleCreate} disabled={pending} style={{
              height: 32, padding: "0 14px", display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff",
              cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}>
              <Plus size={12} />
              {pending ? "Création…" : "Créer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
