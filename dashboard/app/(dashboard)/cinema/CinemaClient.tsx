"use client";

import { useState, useTransition } from "react";
import { Plus, Clapperboard, CheckCircle, XCircle, Calendar, Users, Star } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/PageShell";
import { launchCinemaParty, searchTmdbAction, endCinemaParty, cancelCinemaParty } from "./actions";
import type { ActionResult, TmdbResult, TmdbSearchResponse } from "./actions";

const BD = "1px solid rgba(255,255,255,0.08)";

type TmdbMeta = { posterUrl: string | null; overview: string | null; genres: string[] };

export type PartyWithMeta = {
  messageId: string;
  title: string;
  mediaType: string;
  viewingAt: string;
  status: string;
  participants: number;
  avgRating: string | null;
  meta: TmdbMeta;
};

type DialogState =
  | { type: "none" }
  | { type: "launch" }
  | { type: "end";    party: PartyWithMeta }
  | { type: "cancel"; party: PartyWithMeta };

type FormValues  = { title: string; mediaType: string; date: string; time: string };
type LaunchStep  = { step: "form" } | { step: "confirm"; tmdb: TmdbResult; fv: FormValues };

// ── Shared styles ─────────────────────────────────────────────────────────────

const btnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 8,
  background: "#fff", color: "#000", border: "none", borderRadius: 8,
  padding: "8px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 6,
  background: "transparent", color: "rgba(255,255,255,0.45)",
  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
  padding: "8px 16px", fontSize: 14, cursor: "pointer",
};
const btnSuccess: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  background: "rgba(74,222,128,0.10)", color: "#4ade80",
  border: "1px solid rgba(74,222,128,0.18)", borderRadius: 6,
  padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 5,
  background: "rgba(239,68,68,0.10)", color: "#ef4444",
  border: "1px solid rgba(239,68,68,0.18)", borderRadius: 6,
  padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#fff",
  width: "100%", outline: "none",
};

// ── Poster ────────────────────────────────────────────────────────────────────

function Poster({ url, title, width = 48 }: { url: string | null; title: string; width?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} style={{ width, borderRadius: 6, objectFit: "cover", aspectRatio: "2/3", flexShrink: 0 }} />;
  }
  return (
    <div style={{ width, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "2/3", flexShrink: 0 }}>
      <Clapperboard size={Math.round(width * 0.35)} style={{ color: "rgba(255,255,255,0.18)" }} />
    </div>
  );
}

// ── LaunchDialog ──────────────────────────────────────────────────────────────

function LaunchDialog({ onClose }: { onClose: () => void }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [state, setState] = useState<LaunchStep>({ step: "form" });
  const [fv, setFv] = useState<FormValues>({ title: "", mediaType: "movie", date: tomorrow, time: "21:00" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleSearch() {
    if (!fv.title.trim()) { setError("Entre un titre."); return; }
    setError(null);
    start(async () => {
      const res: TmdbSearchResponse = await searchTmdbAction(fv.title, fv.mediaType);
      if (!res.ok) { setError(res.error); return; }
      setState({ step: "confirm", tmdb: res.result, fv });
    });
  }

  function handleLaunch() {
    if (state.step !== "confirm") return;
    setError(null);
    start(async () => {
      const res: ActionResult = await launchCinemaParty({ mediaType: state.fv.mediaType, date: state.fv.date, time: state.fv.time, tmdb: state.tmdb });
      if (res.success) onClose(); else setError(res.error);
    });
  }

  if (state.step === "confirm") {
    const { tmdb } = state;
    const date = new Date(`${state.fv.date}T${state.fv.time}:00`);
    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la séance</DialogTitle>
          <DialogDescription>Vérifiez les informations avant de publier l&apos;annonce.</DialogDescription>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 14 }}>
            <Poster url={tmdb.posterUrl} title={tmdb.resolvedTitle} width={60} />
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{tmdb.resolvedTitle}</p>
              {tmdb.genres.length > 0 && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{tmdb.genres.join(", ")}</p>}
              {tmdb.overview && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {tmdb.overview}
                </p>
              )}
              {(tmdb.director || tmdb.runtime) && (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 }}>
                  {tmdb.director && `${state.fv.mediaType === "movie" ? "Réal." : "Créateur"} ${tmdb.director}`}
                  {tmdb.director && tmdb.runtime && " · "}{tmdb.runtime}
                </p>
              )}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>Diffusion</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
              {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {state.fv.time}
            </span>
          </div>
          {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
        </div>
        <DialogFooter>
          <button style={btnGhost} onClick={() => { setError(null); setState({ step: "form" }); }}>← Modifier</button>
          <button style={{ ...btnPrimary, opacity: pending ? 0.6 : 1, cursor: pending ? "not-allowed" : "pointer" }} disabled={pending} onClick={handleLaunch}>
            {pending ? "Publication…" : "Lancer la séance"}
          </button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nouvelle séance</DialogTitle>
        <DialogDescription>Recherchez le titre sur TMDB pour récupérer les infos automatiquement.</DialogDescription>
      </DialogHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Titre</label>
          <input style={inputStyle} placeholder="Interstellar" value={fv.title}
            onChange={e => setFv(v => ({ ...v, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSearch()} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Type</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ value: "movie", label: "🎬 Film" }, { value: "tv", label: "📺 Série" }].map((o) => (
              <label key={o.value} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, background: fv.mediaType === o.value ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", border: `1px solid ${fv.mediaType === o.value ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "background 0.15s" }}>
                <input type="radio" name="mediaType" value={o.value} checked={fv.mediaType === o.value}
                  onChange={() => setFv(v => ({ ...v, mediaType: o.value }))} style={{ accentColor: "#fff" }} />
                <span style={{ fontSize: 14 }}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Date</label>
            <input type="date" style={{ ...inputStyle, colorScheme: "dark" }} value={fv.date}
              onChange={e => setFv(v => ({ ...v, date: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>Heure</label>
            <input type="time" style={{ ...inputStyle, colorScheme: "dark" }} value={fv.time}
              onChange={e => setFv(v => ({ ...v, time: e.target.value }))} />
          </div>
        </div>
        {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
      </div>
      <DialogFooter>
        <button style={btnGhost} onClick={onClose}>Annuler</button>
        <button style={{ ...btnPrimary, opacity: pending ? 0.6 : 1, cursor: pending ? "not-allowed" : "pointer" }} disabled={pending} onClick={handleSearch}>
          {pending ? "Recherche…" : "Suivant →"}
        </button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── EndDialog ─────────────────────────────────────────────────────────────────

function EndDialog({ party, onClose }: { party: PartyWithMeta; onClose: () => void }) {
  const [error, setError]     = useState<string | null>(null);
  const [rating, setRating]   = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [pending, start]      = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await endCinemaParty(party.messageId, party.title, rating || undefined);
      if (res.success) onClose(); else setError(res.error);
    });
  }

  const display = hovered || rating;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Terminer la séance</DialogTitle>
        <DialogDescription>
          «&nbsp;<span style={{ fontWeight: 600, color: "#fff" }}>{party.title}</span>&nbsp;» sera marquée comme terminée.
        </DialogDescription>
      </DialogHeader>

      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 10 }}>Note (optionnel)</p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button"
              onClick={() => setRating(r => r === n ? 0 : n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
            >
              <Star size={24}
                fill={display >= n ? "#facc15" : "none"}
                stroke={display >= n ? "#facc15" : "rgba(255,255,255,0.25)"}
                strokeWidth={1.5}
              />
            </button>
          ))}
          {rating > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>
              {rating}/5
            </span>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <DialogFooter>
        <button style={btnGhost} onClick={onClose}>Retour</button>
        <button style={{ ...btnPrimary, opacity: pending ? 0.6 : 1, cursor: pending ? "not-allowed" : "pointer" }} disabled={pending} onClick={handle}>
          {pending ? "Enregistrement…" : "Terminer"}
        </button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── CancelDialog ──────────────────────────────────────────────────────────────

function CancelDialog({ party, onClose }: { party: PartyWithMeta; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await cancelCinemaParty(party.messageId, party.title);
      if (res.success) onClose(); else setError(res.error);
    });
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Annuler la séance</DialogTitle>
        <DialogDescription>
          «&nbsp;<span style={{ fontWeight: 600, color: "#fff" }}>{party.title}</span>&nbsp;» sera supprimée et l&apos;annonce Discord retirée.
        </DialogDescription>
      </DialogHeader>
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
      <DialogFooter>
        <button style={btnGhost} onClick={onClose}>Retour</button>
        <button style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 8, padding: "8px 16px", fontSize: 14, fontWeight: 600, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }} disabled={pending} onClick={handle}>
          {pending ? "Annulation…" : "Annuler la séance"}
        </button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CinemaClient({ partiesWithMeta }: { partiesWithMeta: PartyWithMeta[] }) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  function close() { setDialog({ type: "none" }); }

  const now      = new Date();
  const upcoming = partiesWithMeta.filter(p => p.status === "active" && new Date(p.viewingAt) > now);
  const history  = partiesWithMeta.filter(p => p.status !== "active" || new Date(p.viewingAt) <= now);

  return (
    <>
      {/* Bouton nouvelle séance */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setDialog({ type: "launch" })} style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", color: "#000", border: "none", borderRadius: 8,
          padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          <Plus size={15} />
          Nouvelle séance
        </button>
      </div>

      {/* Séances prévues */}
      {upcoming.length > 0 && (
        <SectionCard title="Séances prévues" badge={upcoming.length} noPadding>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {upcoming.map((p, i) => {
              const date   = new Date(p.viewingAt);
              const isPast = date <= now;
              return (
                <div key={p.messageId} style={{ display: "flex", gap: 14, padding: "14px 20px", borderTop: i > 0 ? BD : undefined, alignItems: "center" }}>
                  <Poster url={p.meta.posterUrl} title={p.title} width={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                    {p.meta.genres.length > 0 && (
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{p.meta.genres.join(", ")}</p>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
                      <Calendar size={11} style={{ flexShrink: 0 }} />
                      {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    {isPast && (
                      <button style={btnSuccess} onClick={() => setDialog({ type: "end", party: p })}>
                        <CheckCircle size={12} /> Terminer
                      </button>
                    )}
                    <button style={btnDanger} onClick={() => setDialog({ type: "cancel", party: p })}>
                      <XCircle size={12} /> Annuler
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Historique */}
      <SectionCard title="Historique" badge={history.length} noPadding>
        {history.length === 0 ? (
          <p style={{ padding: "20px", fontSize: 14, color: "rgba(255,255,255,0.28)", textAlign: "center" }}>Aucune séance terminée.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {history.map((p, i) => {
              const date = new Date(p.viewingAt);
              return (
                <div key={p.messageId} style={{ display: "flex", gap: 14, padding: "12px 20px", borderTop: i > 0 ? BD : undefined, alignItems: "center" }}>
                  <Poster url={p.meta.posterUrl} title={p.title} width={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                      {p.meta.genres.length > 0 ? p.meta.genres.join(", ") : (p.mediaType === "movie" ? "Film" : "Série")}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
                      {date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {p.participants > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
                          <Users size={10} /> {p.participants}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {[1,2,3,4,5].map(n => {
                          const val = p.avgRating ? parseFloat(p.avgRating) : 0;
                          const filled = val >= n;
                          const half   = !filled && val >= n - 0.5;
                          return (
                            <Star key={n} size={11}
                              fill={filled ? "#facc15" : half ? "#facc1580" : "none"}
                              stroke={filled || half ? "#facc15" : "rgba(255,255,255,0.20)"}
                              strokeWidth={1.5}
                            />
                          );
                        })}
                        {p.avgRating && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", marginLeft: 4 }}>
                            {p.avgRating}/5
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Dialogs */}
      <Dialog open={dialog.type === "launch"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "launch" && <LaunchDialog onClose={close} />}
      </Dialog>
      <Dialog open={dialog.type === "end"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "end" && <EndDialog party={dialog.party} onClose={close} />}
      </Dialog>
      <Dialog open={dialog.type === "cancel"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "cancel" && <CancelDialog party={dialog.party} onClose={close} />}
      </Dialog>
    </>
  );
}
