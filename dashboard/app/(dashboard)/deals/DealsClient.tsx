"use client";

import { useState, useTransition } from "react";
import { Trash, FloppyDisk, CaretDown, Hash, SpeakerHigh, ArrowRight } from "@phosphor-icons/react";
import { saveDealsNotifChannel, removeDealsGame } from "./actions";
import type { DiscordChannel } from "@/components/FeatureSettings";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

type Game = {
  id: number; steamAppId: number; title: string; headerImage: string | null;
  addedByName: string; isOnSale: number;
  lastKnownPriceEur: number | null; lastKnownDiscount: number | null;
};

function formatEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

function ChannelIcon({ type }: { type: number }) {
  return type === 2 || type === 13
    ? <SpeakerHigh size={11} style={{ color: "rgba(255,255,255,0.30)", flexShrink: 0 }} />
    : <Hash        size={11} style={{ color: "rgba(255,255,255,0.30)", flexShrink: 0 }} />;
}

export function DealsClient({ channelId, channelName, notifChannelId, games, channels }: {
  channelId: string;
  channelName: string;
  notifChannelId: string | null;
  games: Game[];
  channels: DiscordChannel[];
}) {
  const [notifVal, setNotifVal]       = useState(notifChannelId ?? "");
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [gamesOpen, setGamesOpen]     = useState(false);
  const [removing, setRemoving]       = useState<number | null>(null);
  const [pending, startSave]          = useTransition();
  const [removePending, startRemove]  = useTransition();

  const textChannels = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position);

  const notifChannel  = textChannels.find((c) => c.id === notifVal) ?? null;
  const onSaleCount   = games.filter((g) => g.isOnSale === 1).length;

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
    <div className="card-glow anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* ── Ligne principale : salon source → salon notifs ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr auto auto",
        alignItems: "center", gap: 12, padding: "14px 20px",
      }}>
        {/* Salon source (liste) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <Hash size={14} style={{ color: "rgba(255,255,255,0.40)", flexShrink: 0 }} />
          <span style={{ fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {channelName}
          </span>
          {onSaleCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "2px 7px", borderRadius: 99, flexShrink: 0 }}>
              🔥 {onSaleCount}
            </span>
          )}
        </div>

        {/* Flèche */}
        <ArrowRight size={13} style={{ color: "rgba(255,255,255,0.20)" }} />

        {/* Select salon notifs */}
        <div style={{ position: "relative" }}>
          <select
            value={notifVal}
            onChange={(e) => { setNotifVal(e.target.value); setSaved(false); }}
            style={{
              width: "100%", height: 32,
              background: notifVal ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
              border: notifVal ? BDI : BD,
              borderRadius: 8, padding: "0 28px 0 10px",
              fontSize: 13, color: notifVal ? "#fff" : "rgba(255,255,255,0.35)",
              outline: "none", cursor: "pointer", appearance: "none",
            }}
          >
            <option value="">— Salon de notifs —</option>
            {textChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === 2 || c.type === 13 ? "🔊 " : "# "}{c.name}
              </option>
            ))}
          </select>
          <CaretDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.30)", pointerEvents: "none" }} />
        </div>

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

        {/* Jeux toggle */}
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

      {error && (
        <p style={{ padding: "0 20px 12px", fontSize: 12, color: "#ef4444" }}>{error}</p>
      )}

      {/* ── Jeux (dépliables) ── */}
      {gamesOpen && (
        <div style={{ borderTop: BD }}>
          {games.length === 0 ? (
            <p style={{ padding: "14px 20px", fontSize: 13, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
              Aucun jeu dans cette liste.
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
                  <a
                    href={`https://store.steampowered.com/app/${g.steamAppId}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 17, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {g.title}
                  </a>
                  <p style={{ fontSize: 12, color: g.isOnSale === 1 ? "#4ade80" : "rgba(255,255,255,0.38)", marginTop: 2 }}>
                    {priceStr}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>{g.addedByName}</span>
                <button
                  className="rm-btn"
                  type="button"
                  onClick={() => handleRemove(g.id)}
                  disabled={removePending && removing === g.id}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", opacity: 0, transition: "opacity 0.15s, color 0.15s", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
                  title="Retirer"
                >
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
