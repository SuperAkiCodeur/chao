"use client";

import { useState, useTransition } from "react";
import {
  ArrowSquareOut, PaperPlaneTilt, PencilSimple, Trash,
  Check, WarningCircle, X, CaretDown, ClockCounterClockwise,
  Newspaper, Clock,
} from "@phosphor-icons/react";
import { ChannelSelect } from "@/components/ChannelSelect";
import { TimesPicker } from "./AddFeedForm";
import { updateFeed, deleteFeed, postArticleNow, getFeedHistory } from "./actions";
import type { HistoryEntry } from "./actions";
import type { DiscordChannel } from "@/lib/discord";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Article = { title: string; url: string; description: string; date: string; source?: string };
export type Feed    = {
  id: number; guildId: string; name: string; rssUrl: string;
  channelId: string; color: number; postTimes: string; createdAt: string;
  articles: Article[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const toHex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
const toInt = (h: string) => parseInt(h.replace("#", ""), 16);

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

function fmtDate(raw: string) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// ── ArticleRow ────────────────────────────────────────────────────────────────

type PostStatus = "idle" | "pending" | "success" | "error";

function ArticleRow({ article, feed, onPost }: {
  article: Article;
  feed: Feed;
  onPost: (a: Article) => void;
}) {
  const [status, setStatus] = useState<PostStatus>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function handlePost() {
    setStatus("pending");
    const res = await postArticleNow({
      feedId:    feed.id,
      channelId: feed.channelId,
      feedName:  feed.name,
      feedUrl:   (() => { try { return new URL(feed.rssUrl).origin; } catch { return feed.rssUrl; } })(),
      color:     feed.color,
      article,
    });
    if (res.success) { setStatus("success"); onPost(article); }
    else             { setStatus("error"); setErrMsg(res.error ?? "Erreur"); }
  }

  const date = new Date(article.date);
  const excerpt = article.description.slice(0, 140);

  return (
    <div style={{ padding: "11px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={article.url} target="_blank" rel="noreferrer"
          style={{ fontSize: 14, fontWeight: 500, color: "#fff", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, lineHeight: 1.4 }}>
          {article.title}
          <ArrowSquareOut size={10} style={{ opacity: 0.3, flexShrink: 0 }} />
        </a>
        {excerpt && (
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.5 }}>
            {excerpt}{article.description.length > 140 ? " […]" : ""}
          </p>
        )}
        {status === "error" && (
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#ef4444" }}>{errMsg}</p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
        {article.date && !isNaN(date.getTime()) && (
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)" }}>
            {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </span>
        )}
        {status === "success" ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
            color: "#4ade80", padding: "3px 9px", borderRadius: 6,
            background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.18)" }}>
            <Check size={11} /> Posté
          </span>
        ) : status === "error" ? (
          <button onClick={handlePost}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
              color: "#ef4444", padding: "3px 9px", borderRadius: 6, cursor: "pointer",
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.18)" }}>
            <WarningCircle size={11} /> Réessayer
          </button>
        ) : (
          <button onClick={handlePost} disabled={status === "pending"}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600,
              color: "#fff", padding: "3px 9px", borderRadius: 6, cursor: status === "pending" ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              opacity: status === "pending" ? 0.5 : 1 }}>
            <PaperPlaneTilt size={11} />
            {status === "pending" ? "Envoi…" : "Poster"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, count, accent }: {
  icon: React.ReactNode; label: string; count?: number; accent?: string;
}) {
  return (
    <div style={{ padding: "10px 20px 6px", display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ color: accent ?? "rgba(255,255,255,0.28)" }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: accent ?? "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {label}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginLeft: "auto" }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ── HistorySection ────────────────────────────────────────────────────────────

function HistorySection({ feedId }: { feedId: number }) {
  const [history, setHistory]   = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function load() {
    setLoading(true);
    setExpanded(true);
    const data = await getFeedHistory(feedId);
    setHistory(data);
    setLoading(false);
  }

  return (
    <div style={{ borderTop: BD }}>
      <div style={{ padding: "10px 20px 6px", display: "flex", alignItems: "center", gap: 7 }}>
        <ClockCounterClockwise size={12} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
          Historique
        </span>
        {history === null ? (
          <button onClick={load} disabled={loading}
            style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: BD,
              borderRadius: 6, padding: "3px 10px", cursor: "pointer", opacity: loading ? 0.5 : 1 }}>
            {loading ? "Chargement…" : "Charger"}
          </button>
        ) : (
          <button onClick={() => setExpanded(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.30)",
              background: "none", border: "none", cursor: "pointer" }}>
            {history.length} entrée{history.length > 1 ? "s" : ""}
            <CaretDown size={10} style={{ transform: expanded ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
          </button>
        )}
      </div>

      {expanded && history !== null && (
        history.length === 0 ? (
          <p style={{ padding: "8px 20px 12px", fontSize: 12, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
            Aucun article posté pour ce flux.
          </p>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {history.map((h) => (
              <div key={h.id} style={{ padding: "8px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, flexShrink: 0,
                  ...(h.source === "auto"
                    ? { color: "#38bdf8", background: "rgba(56,189,248,0.10)", border: "1px solid rgba(56,189,248,0.18)" }
                    : { color: "#a78bfa", background: "rgba(167,139,250,0.10)", border: "1px solid rgba(167,139,250,0.18)" }),
                }}>
                  {h.source === "auto" ? "Auto" : "Manuel"}
                </span>
                {h.link ? (
                  <a href={h.link} target="_blank" rel="noreferrer"
                    style={{ flex: 1, minWidth: 0, fontSize: 12, color: "rgba(255,255,255,0.65)", textDecoration: "none",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                    {h.title}
                    <ArrowSquareOut size={9} style={{ opacity: 0.3, flexShrink: 0 }} />
                  </a>
                ) : (
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "rgba(255,255,255,0.65)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {h.title}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.20)", flexShrink: 0 }}>
                  {fmtDate(h.postedAt)}
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── EditForm ──────────────────────────────────────────────────────────────────

function parseTimes(raw: string): number[] {
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : [9]; } catch { return [9]; }
}

function EditForm({ feed, channels, onSave, onCancel }: {
  feed: Feed; channels: DiscordChannel[];
  onSave: (data: { name: string; rssUrl: string; channelId: string; color: number; postTimes: number[] }) => void;
  onCancel: () => void;
}) {
  const [name,      setName]      = useState(feed.name);
  const [rssUrl,    setRssUrl]    = useState(feed.rssUrl);
  const [channelId, setChannelId] = useState(feed.channelId);
  const [color,     setColor]     = useState(toHex(feed.color));
  const [postTimes, setPostTimes] = useState<number[]>(parseTimes(feed.postTimes));
  const [error,     setError]     = useState<string | null>(null);
  const [pending,   start]        = useTransition();

  const inp: React.CSSProperties = {
    height: 34, width: "100%", background: "rgba(255,255,255,0.05)",
    border: BDI, borderRadius: 8, padding: "0 12px", fontSize: 13, color: "#fff", outline: "none",
  };

  function handleSave() {
    if (!name.trim() || !rssUrl.trim() || !channelId) { setError("Tous les champs sont requis."); return; }
    if (postTimes.length === 0) { setError("Au moins une heure requise."); return; }
    setError(null);
    start(async () => {
      const res = await updateFeed(feed.id, { name: name.trim(), rssUrl: rssUrl.trim(), channelId, color: toInt(color), postTimes });
      if (res.success) onSave({ name: name.trim(), rssUrl: rssUrl.trim(), channelId, color: toInt(color), postTimes });
      else setError(res.error ?? "Erreur.");
    });
  }

  return (
    <div style={{ padding: "16px 20px", borderTop: BD, display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { label: "Nom",     node: <input value={name}   onChange={e => setName(e.target.value)}   style={inp} maxLength={60} placeholder="Ex : Palestine…" /> },
        { label: "Salon",   node: <ChannelSelect value={channelId} onChange={setChannelId} channels={channels.filter(c => c.type !== 4)} /> },
        { label: "RSS URL", node: <input value={rssUrl} onChange={e => setRssUrl(e.target.value)} style={inp} placeholder="https://…" /> },
        { label: "Couleur", node: (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 36, height: 28, border: "none", borderRadius: 6, cursor: "pointer", padding: 2, background: "none" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{color}</span>
          </div>
        )},
      ].map(({ label, node }) => (
        <div key={label} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{label}</label>
          {node}
        </div>
      ))}
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, alignItems: "flex-start" }}>
        <label style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, paddingTop: 5 }}>
          <Clock size={11} style={{ marginRight: 4 }} />Horaires
        </label>
        <TimesPicker value={postTimes} onChange={setPostTimes} />
      </div>
      {error && <p style={{ margin: 0, fontSize: 12, color: "#ef4444" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onCancel} style={{ height: 32, padding: "0 14px", background: "none", border: BD, borderRadius: 8, fontSize: 13, color: "rgba(255,255,255,0.40)", cursor: "pointer" }}>
          Annuler
        </button>
        <button onClick={handleSave} disabled={pending}
          style={{ height: 32, padding: "0 14px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1 }}>
          {pending ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

// ── NewsFeedCard ──────────────────────────────────────────────────────────────

export function NewsFeedCard({ feed: initialFeed, channels }: { feed: Feed; channels: DiscordChannel[] }) {
  const [feed,    setFeed]    = useState(initialFeed);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [, start]             = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer le flux « ${feed.name} » ?`)) return;
    start(async () => { await deleteFeed(feed.id); });
  }

  const ch        = channels.find(c => c.id === feed.channelId);
  const schedule  = parseTimes(feed.postTimes).map(h => `${h}h`).join(" · ");

  return (
    <div className="anim-fade-up" style={{ background: "#202020", borderRadius: 12, border: BD, overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 20px" }}>

        {/* Toggle zone */}
        <button type="button" onClick={() => { setOpen(v => !v); setEditing(false); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", minWidth: 0, textAlign: "left" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: toHex(feed.color), flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 400, color: "#fff", fontFamily: "var(--font-serif)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {feed.name}
          </span>
          {ch && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>#{ch.name}</span>}
          <span style={{ fontSize: 11, color: "rgba(56,189,248,0.60)", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
            <Clock size={10} />
            {schedule}
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", flexShrink: 0 }}>
            {feed.articles.length} art.
          </span>
        </button>

        {/* Action buttons */}
        <button onClick={() => { setEditing(v => !v); if (!open) setOpen(true); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: BD, background: "none", color: editing ? "#fff" : "rgba(255,255,255,0.35)", cursor: "pointer", flexShrink: 0 }}>
          {editing ? <X size={14} /> : <PencilSimple size={14} />}
        </button>
        <button onClick={handleDelete}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: BD, background: "none", color: "rgba(239,68,68,0.50)", cursor: "pointer", flexShrink: 0 }}>
          <Trash size={14} />
        </button>
        <button type="button" onClick={() => { setOpen(v => !v); setEditing(false); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 7, border: BD, background: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", flexShrink: 0 }}>
          <CaretDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.18s ease" }} />
        </button>
      </div>

      {/* ── Edit form ── */}
      {open && editing && (
        <EditForm
          feed={feed}
          channels={channels}
          onSave={(data) => { setFeed(f => ({ ...f, ...data, postTimes: JSON.stringify(data.postTimes) })); setEditing(false); }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* ── Sections ── */}
      {open && !editing && (
        <>
          {/* Section 1 : Derniers articles */}
          <div style={{ borderTop: BD }}>
            <SectionHeader
              icon={<Newspaper size={12} />}
              label="Derniers articles"
              count={feed.articles.length}
            />
            {feed.articles.length === 0 ? (
              <p style={{ padding: "6px 20px 12px", fontSize: 12, color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>
                Aucun article disponible pour ce flux.
              </p>
            ) : (
              <ArticlesWithMore articles={feed.articles} feed={feed} />
            )}
          </div>

          {/* Section 2 : Historique */}
          <HistorySection feedId={feed.id} />
        </>
      )}
    </div>
  );
}

// ── ArticlesWithMore ──────────────────────────────────────────────────────────

function ArticlesWithMore({ articles, feed }: { articles: Article[]; feed: Feed }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? articles : articles.slice(0, 5);

  return (
    <>
      {visible.map((a, i) => <ArticleRow key={i} article={a} feed={feed} onPost={() => {}} />)}
      {articles.length > 5 && (
        <button onClick={() => setShowAll(v => !v)}
          style={{ display: "block", width: "100%", padding: "8px 20px", background: "none", border: "none",
            borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(255,255,255,0.28)",
            cursor: "pointer", textAlign: "center" }}>
          {showAll ? "Voir moins" : `Voir ${articles.length - 5} de plus`}
        </button>
      )}
    </>
  );
}
