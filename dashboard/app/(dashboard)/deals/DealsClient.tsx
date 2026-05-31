"use client";

import { useState, useTransition } from "react";
import { CaretDown, Hash, SpeakerHigh, FloppyDisk } from "@phosphor-icons/react";
import { setDealsNotifChannel } from "./actions";
import type { DiscordChannel } from "@/components/FeatureSettings";

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

type Game = {
  id: number; steamAppId: number; title: string; headerImage: string | null;
  addedByName: string; isOnSale: number; lastKnownPriceEur: number | null;
  lastKnownDiscount: number | null; lastCheckedAt: string | null;
};
type Member = { userId: string; userName: string };
type List = {
  id: number; name: string; ownerId: string; ownerName: string;
  notifChannelId: string | null; createdAt: string;
  games: Game[]; members: Member[];
};

function formatEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

export function DealsClient({ list, channels }: { list: List; channels: DiscordChannel[] }) {
  const [open, setOpen]           = useState(false);
  const [notifId, setNotifId]     = useState(list.notifChannelId ?? "");
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pending, start]          = useTransition();

  const textChannels = channels
    .filter((c) => c.type !== 4)
    .sort((a, b) => a.position - b.position);

  const onSale = list.games.filter((g) => g.isOnSale === 1);

  function handleSave() {
    setError(null); setSaved(false);
    start(async () => {
      const res = await setDealsNotifChannel(list.id, notifId || null);
      if (res.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
      else setError(res.error);
    });
  }

  return (
    <div className="card-glow anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: BD, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>{list.name}</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 3 }}>
            par {list.ownerName}
            {list.members.length > 0 && ` · partagée avec ${list.members.map((m) => m.userName).join(", ")}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onSale.length > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", padding: "3px 10px", borderRadius: 99 }}>
              🔥 {onSale.length} en promo
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.06)", padding: "3px 10px", borderRadius: 99 }}>
            {list.games.length} jeu{list.games.length !== 1 ? "x" : ""}
          </span>
        </div>
      </div>

      {/* Games list */}
      {list.games.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          {list.games.map((g, i) => {
            const priceStr = g.lastKnownPriceEur !== null
              ? g.isOnSale === 1
                ? `En promo — ${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)`
                : formatEur(g.lastKnownPriceEur)
              : "Prix non vérifié";

            return (
              <div key={g.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px",
                borderTop: i > 0 ? BD : undefined,
              }}>
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
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>
                  {g.addedByName}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Config salon notifs */}
      <div style={{ borderTop: BD }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            Salon de notifications
            {list.notifChannelId && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.30)", textTransform: "none", letterSpacing: 0 }}>
                configuré
              </span>
            )}
          </span>
          <CaretDown size={12} style={{ color: "rgba(255,255,255,0.30)", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
        </button>

        {open && (
          <div style={{ padding: "0 20px 16px", display: "flex", gap: 10, alignItems: "center" }}>
            <select
              value={notifId}
              onChange={(e) => setNotifId(e.target.value)}
              style={{
                flex: 1, height: 34,
                background: "rgba(255,255,255,0.05)", border: BDI, borderRadius: 8,
                padding: "0 10px", fontSize: 13, color: notifId ? "#fff" : "rgba(255,255,255,0.35)",
                outline: "none", cursor: "pointer",
              }}
            >
              <option value="">— Aucun —</option>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === 2 || c.type === 13 ? "🔊" : "#"} {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 8, padding: "0 14px", height: 34, fontSize: 13, fontWeight: 600,
                cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1,
              }}
            >
              <FloppyDisk size={13} />
              {pending ? "…" : "Sauvegarder"}
            </button>
            {saved  && <span style={{ fontSize: 12, color: "#4ade80" }}>✓</span>}
            {error  && <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>}
          </div>
        )}
      </div>

    </div>
  );
}
