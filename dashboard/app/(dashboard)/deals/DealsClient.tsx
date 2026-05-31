"use client";

import { useState, useTransition } from "react";
import { Trash, FloppyDisk, CaretDown, Hash, SpeakerHigh } from "@phosphor-icons/react";
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

export function DealsClient({ channelId, channelName, notifChannelId, games, channels }: {
  channelId: string;
  channelName: string;
  notifChannelId: string | null;
  games: Game[];
  channels: DiscordChannel[];
}) {
  const [configOpen, setConfigOpen]     = useState(false);
  const [notifVal, setNotifVal]         = useState(notifChannelId ?? "");
  const [savedConfig, setSavedConfig]   = useState(false);
  const [errorConfig, setErrorConfig]   = useState<string | null>(null);
  const [removing, setRemoving]         = useState<number | null>(null);
  const [configPending, startConfig]    = useTransition();
  const [removePending, startRemove]    = useTransition();

  const textChannels = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position);

  const currentNotifName = notifVal
    ? textChannels.find((c) => c.id === notifVal)?.name ?? null
    : null;

  const onSale = games.filter((g) => g.isOnSale === 1);

  function handleSaveConfig() {
    setErrorConfig(null); setSavedConfig(false);
    startConfig(async () => {
      const res = await saveDealsNotifChannel(channelId, notifVal);
      if (res.success) { setSavedConfig(true); setTimeout(() => setSavedConfig(false), 2500); }
      else setErrorConfig(res.error);
    });
  }

  function handleRemove(id: number) {
    setRemoving(id);
    startRemove(async () => {
      await removeDealsGame(id);
      setRemoving(null);
    });
  }

  return (
    <div className="card-glow anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: BD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>
            #{channelName}
          </p>
          {currentNotifName && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 3 }}>
              📢 Notifs → #{currentNotifName}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSale.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "3px 10px", borderRadius: 99 }}>
              🔥 {onSale.length} en promo
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 99 }}>
            {games.length} jeu{games.length !== 1 ? "x" : ""}
          </span>
        </div>
      </div>

      {/* Jeux */}
      {games.map((g, i) => {
        const priceStr = g.lastKnownPriceEur !== null
          ? g.isOnSale === 1
            ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
            : formatEur(g.lastKnownPriceEur)
          : "Prix non vérifié";

        return (
          <div
            key={g.id}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderTop: i === 0 ? undefined : BD, transition: "background 0.12s" }}
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
                style={{ fontSize: 19, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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
              title="Retirer de la liste"
            >
              <Trash size={14} />
            </button>
          </div>
        );
      })}

      {/* Config salon notifs */}
      <div style={{ borderTop: BD }}>
        <button
          type="button"
          onClick={() => setConfigOpen((v) => !v)}
          style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Salon de notifications
          </span>
          <CaretDown size={12} style={{ color: "rgba(255,255,255,0.28)", transform: configOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
        </button>

        {configOpen && (
          <div style={{ padding: "0 20px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <select
                value={notifVal}
                onChange={(e) => setNotifVal(e.target.value)}
                style={{
                  width: "100%", height: 34,
                  background: "rgba(255,255,255,0.05)", border: BDI, borderRadius: 8,
                  padding: "0 10px", fontSize: 13,
                  color: notifVal ? "#fff" : "rgba(255,255,255,0.35)",
                  outline: "none", cursor: "pointer", appearance: "none",
                }}
              >
                <option value="">— Aucun —</option>
                {textChannels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type === 2 || c.type === 13 ? "🔊 " : "# "}{c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={configPending}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: "rgba(255,255,255,0.10)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8,
                padding: "0 14px", height: 34, fontSize: 13, fontWeight: 600,
                cursor: configPending ? "not-allowed" : "pointer", opacity: configPending ? 0.6 : 1,
              }}
            >
              <FloppyDisk size={13} />
              {configPending ? "…" : "Sauvegarder"}
            </button>
            {savedConfig && <span style={{ fontSize: 12, color: "#4ade80", flexShrink: 0 }}>✓</span>}
            {errorConfig && <span style={{ fontSize: 12, color: "#ef4444", flexShrink: 0 }}>{errorConfig}</span>}
          </div>
        )}
      </div>

    </div>
  );
}
