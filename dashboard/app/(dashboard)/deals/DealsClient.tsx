"use client";

import { useState, useTransition } from "react";
import { Trash, FloppyDisk, CaretDown, Hash, PencilSimple, Check, ArrowRight } from "@phosphor-icons/react";
import { saveDealsNotifChannel, removeDealsGame, renameDeals } from "./actions";
import { ChannelSelect } from "@/components/ChannelSelect";
import type { DiscordChannel } from "@/components/FeatureSettings";

const BD  = "1px solid rgba(255,255,255,0.08)";

type Game = {
  id: number; steamAppId: number; title: string; headerImage: string | null;
  addedByName: string; isOnSale: number;
  lastKnownPriceEur: number | null; lastKnownDiscount: number | null;
};

function formatEur(cents: number) { return `${(cents / 100).toFixed(2)} €`; }

export function DealsClient({ channelId, channelName, notifChannelId, listName, games, channels }: {
  channelId: string; channelName: string;
  notifChannelId: string | null; listName: string | null;
  games: Game[]; channels: DiscordChannel[];
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
    <div className="card-glow" style={{ background: "#202020", borderRadius: 12, border: BD, position: "relative" }}>

      {/* Ligne 1 : nom + badges + toggle jeux */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        {nameEditing ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <input
              autoFocus value={nameVal} maxLength={50}
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setNameEditing(false); }}
              style={{
                flex: 1, minWidth: 0, fontSize: 18, fontWeight: 400, fontFamily: "var(--font-serif)",
                color: "#fff", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)", borderRadius: 6, padding: "3px 8px",
              }}
            />
            <button type="button" onClick={handleSaveName} disabled={namePending}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#4ade80", display: "flex", padding: 4, flexShrink: 0 }}>
              <Check size={14} />
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{
              fontSize: 20, fontWeight: 400, fontFamily: "var(--font-serif)",
              color: nameVal ? "#fff" : "rgba(255,255,255,0.25)",
              fontStyle: nameVal ? "normal" : "italic",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {nameVal || "Sans nom"}
            </span>
            {nameSaved && <Check size={12} style={{ color: "#4ade80", flexShrink: 0 }} />}
            <button type="button" onClick={() => setNameEditing(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.20)", display: "flex", padding: 2, flexShrink: 0 }}>
              <PencilSimple size={13} />
            </button>
          </div>
        )}

        {onSaleCount > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#4ade80",
            background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.18)",
            padding: "2px 8px", borderRadius: 99, flexShrink: 0,
          }}>
            🔥 {onSaleCount} en promo
          </span>
        )}

        <button type="button" onClick={() => setGamesOpen((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: gamesOpen ? "rgba(255,255,255,0.08)" : "transparent",
            border: BD, borderRadius: 8, padding: "0 10px", height: 30,
            fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer",
            transition: "background 0.15s",
          }}>
          <span>{games.length} jeu{games.length !== 1 ? "x" : ""}</span>
          <CaretDown size={11} style={{ transform: gamesOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }} />
        </button>
      </div>

      {/* Ligne 2 : #source -> notif + sauvegarder */}
      <div style={{ borderTop: BD, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
          <Hash size={12} style={{ flexShrink: 0 }} />
          <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channelName}</span>
        </span>

        <ArrowRight size={12} style={{ color: "rgba(255,255,255,0.18)", flexShrink: 0 }} />

        <ChannelSelect size="sm" value={notifVal} onChange={(v) => { setNotifVal(v); setSaved(false); }} channels={textChannels} placeholder="Salon de notifs…" />

        <button type="button" onClick={handleSave} disabled={pending}
          style={{
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
            background: saved ? "rgba(74,222,128,0.10)" : "rgba(255,255,255,0.06)",
            color: saved ? "#4ade80" : "rgba(255,255,255,0.60)",
            border: `1px solid ${saved ? "rgba(74,222,128,0.20)" : "rgba(255,255,255,0.10)"}`,
            borderRadius: 8, padding: "0 12px", height: 32,
            fontSize: 12, fontWeight: 600,
            cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.5 : 1,
            transition: "background 0.15s, color 0.15s, border-color 0.15s",
          }}>
          <FloppyDisk size={12} />
          {pending ? "…" : saved ? "Sauvegardé" : "Sauvegarder"}
        </button>
      </div>

      {error && <p style={{ padding: "0 20px 10px", fontSize: 12, color: "#ef4444", margin: 0 }}>{error}</p>}

      {/* Jeux */}
      {gamesOpen && (
        <div style={{ borderTop: BD }}>
          {games.length === 0 ? (
            <p style={{ padding: "14px 20px", fontSize: 13, color: "rgba(255,255,255,0.28)", fontStyle: "italic" }}>
              Aucun jeu — utilise <code>/deals</code> dans <strong>#{channelName}</strong> pour en ajouter.
            </p>
          ) : games.map((g, i) => {
            const priceStr = g.lastKnownPriceEur !== null
              ? g.isOnSale === 1 ? `${formatEur(g.lastKnownPriceEur)} (-${g.lastKnownDiscount ?? 0}%)` : formatEur(g.lastKnownPriceEur)
              : "Prix inconnu";
            return (
              <div key={g.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderTop: i > 0 ? BD : undefined }}
                onMouseEnter={(e) => { (e.currentTarget.querySelector(".rm-btn") as HTMLElement | null)?.style.setProperty("opacity", "1"); e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget.querySelector(".rm-btn") as HTMLElement | null)?.style.setProperty("opacity", "0"); e.currentTarget.style.background = "transparent"; }}>
                {g.headerImage
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={g.headerImage} alt={g.title} style={{ width: 56, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 56, height: 34, borderRadius: 6, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a href={`https://store.steampowered.com/app/${g.steamAppId}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 15, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.title}
                  </a>
                  <p style={{ fontSize: 12, color: g.isOnSale === 1 ? "#4ade80" : "rgba(255,255,255,0.35)", marginTop: 2 }}>
                    {g.isOnSale === 1 ? `En promo — ${priceStr}` : priceStr}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", flexShrink: 0 }}>{g.addedByName}</span>
                <button className="rm-btn" type="button" onClick={() => handleRemove(g.id)}
                  disabled={removePending && removing === g.id}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", borderRadius: 6, display: "flex", opacity: 0, transition: "opacity 0.15s, color 0.15s", flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}>
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
