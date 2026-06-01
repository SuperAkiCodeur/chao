"use client";

import { useState, useTransition } from "react";
import {
  ArrowSquareOut, PaperPlaneTilt, PencilSimple, Trash,
  Check, WarningCircle, X,
} from "@phosphor-icons/react";
import { ChannelSelect } from "@/components/ChannelSelect";
import { updateFeed, deleteFeed, postArticleNow } from "./actions";
import type { DiscordChannel } from "@/lib/discord";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Article = { title: string; url: string; description: string; date: string };
export type Feed    = {
  id: number; guildId: string; name: string; rssUrl: string;
  channelId: string; color: number; createdAt: string;
  articles: Article[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const toHex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
const toInt = (h: string) => parseInt(h.replace("#", ""), 16);

// ── Styles ────────────────────────────────────────────────────────────────────

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

const s = {
  iconBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 7, border: BD,
    background: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer",
  } as React.CSSProperties,
  input: {
    height: 34, width: "100%", background: "rgba(255,255,255,0.05)",
    border: BDI, borderRadius: 8, padding: "0 12px", fontSize: 13, color: "#fff",
  } as React.CSSProperties,
  cancelBtn: {
    height: 32, padding: "0 14px", background: "none", border: BD,
    borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.40)", cursor: "pointer",
  } as React.CSSProperties,
  saveBtn: {
    height: 32, padding: "0 14px",
    background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer",
  } as React.CSSProperties,
  postBtn: {
    display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
    fontSize: 12, fontWeight: 600, color: "#fff",
    padding: "4px 10px", borderRadius: 7,
    background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
  } as React.CSSProperties,
} as const;

// ── Row helper ────────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "center" }}>
      <label style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

// ── NewsFeedCard ──────────────────────────────────────────────────────────────

export function NewsFeedCard({ feed, channels }: { feed: Feed; channels: DiscordChannel[] }) {
  const [editing, setEditing]     = useState(false);
  const [name, setName]           = useState(feed.name);
  const [rssUrl, setRssUrl]       = useState(feed.rssUrl);
  const [channelId, setChannelId] = useState(feed.channelId);
  const [color, setColor]         = useState(toHex(feed.color));
  const [error, setError]         = useState<string | null>(null);
  const [pending, start]          = useTransition();

  const ch = channels.find((c) => c.id === channelId);

  function handleSave() {
    if (!name.trim() || !rssUrl.trim() || !channelId) {
      setError("Tous les champs sont requis."); return;
    }
    setError(null);
    start(async () => {
      const res = await updateFeed(feed.id, { name: name.trim(), rssUrl: rssUrl.trim(), channelId, color: toInt(color) });
      if (res.success) setEditing(false);
      else setError(res.error ?? "Erreur.");
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer le flux « ${feed.name} » ?`)) return;
    start(async () => { await deleteFeed(feed.id); });
  }

  return (
    <div className="anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: BD, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: toHex(feed.color), flexShrink: 0 }} />
        <p style={{ flex: 1, margin: 0, fontSize: 20, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)" }}>
          {feed.name}
        </p>
        {ch && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.30)" }}>#{ch.name}</span>}
        <button onClick={() => { setEditing((v) => !v); setError(null); }} style={s.iconBtn}>
          {editing ? <X size={14} /> : <PencilSimple size={14} />}
        </button>
        <button onClick={handleDelete} disabled={pending}
          style={{ ...s.iconBtn, color: "rgba(239,68,68,0.55)" }}>
          <Trash size={14} />
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ padding: "16px 20px", borderBottom: BD, display: "flex", flexDirection: "column", gap: 12 }}>
          <Row label="Nom">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              style={s.input} placeholder="Ex : Palestine, Tech News…" />
          </Row>
          <Row label="Salon">
            <ChannelSelect value={channelId} onChange={setChannelId}
              channels={channels.filter((c) => c.type !== 4)} />
          </Row>
          <Row label="RSS URL">
            <input value={rssUrl} onChange={(e) => setRssUrl(e.target.value)}
              style={s.input} placeholder="https://example.com/feed/" />
          </Row>
          <Row label="Couleur">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ width: 36, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "none" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{color}</span>
            </div>
          </Row>
          {error && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button onClick={() => { setEditing(false); setError(null); }} style={s.cancelBtn}>Annuler</button>
            <button onClick={handleSave} disabled={pending} style={s.saveBtn}>
              {pending ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      )}

      {/* Articles */}
      <ArticlesList feed={feed} />

    </div>
  );
}

// ── ArticlesList ──────────────────────────────────────────────────────────────

function ArticlesList({ feed }: { feed: Feed }) {
  type Status = "idle" | "pending" | "success" | "error";
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [errors,   setErrors]   = useState<Record<number, string>>({});

  const origin = (() => { try { return new URL(feed.rssUrl).origin; } catch { return feed.rssUrl; } })();

  async function handlePost(article: Article, idx: number) {
    setStatuses((p) => ({ ...p, [idx]: "pending" }));
    const res = await postArticleNow({
      channelId: feed.channelId, feedName: feed.name,
      feedUrl: origin, color: feed.color, article,
    });
    if (res.success) {
      setStatuses((p) => ({ ...p, [idx]: "success" }));
    } else {
      setStatuses((p) => ({ ...p, [idx]: "error" }));
      setErrors((p)   => ({ ...p, [idx]: res.error }));
    }
  }

  if (feed.articles.length === 0) {
    return (
      <p style={{ padding: "16px 20px", margin: 0, fontSize: 13, color: "rgba(255,255,255,0.25)", fontStyle: "italic", textAlign: "center" }}>
        Aucun article disponible pour ce flux.
      </p>
    );
  }

  return (
    <div>
      {/* Section label */}
      <div style={{ padding: "10px 20px 6px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Articles RSS
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}>
          {feed.articles.length} articles
        </span>
      </div>

      {feed.articles.map((article, i) => {
        const status  = statuses[i] ?? "idle";
        const err     = errors[i];
        const date    = new Date(article.date);
        const excerpt = article.description.slice(0, 160);

        return (
          <div key={i} style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={article.url} target="_blank" rel="noreferrer" className="hover-slide"
                  style={{ fontSize: 17, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)",
                    textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {article.title}
                  <ArrowSquareOut size={10} style={{ opacity: 0.35, flexShrink: 0 }} />
                </a>
                {excerpt && (
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                    {excerpt}{article.description.length > 160 ? " […]" : ""}
                  </p>
                )}
                {status === "error" && err && (
                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#ef4444" }}>{err}</p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                {article.date && !isNaN(date.getTime()) && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
                    {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                )}
                {status === "success" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
                    color: "#4ade80", padding: "4px 10px", borderRadius: 7,
                    background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.20)" }}>
                    <Check size={11} /> Posté
                  </span>
                ) : status === "error" ? (
                  <button onClick={() => handlePost(article, i)}
                    style={{ ...s.postBtn, color: "#ef4444",
                      background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.20)" }}>
                    <WarningCircle size={11} /> Réessayer
                  </button>
                ) : (
                  <button onClick={() => handlePost(article, i)} disabled={status === "pending"}
                    style={{ ...s.postBtn, opacity: status === "pending" ? 0.5 : 1 }}>
                    <PaperPlaneTilt size={11} />
                    {status === "pending" ? "Envoi…" : "Poster"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
