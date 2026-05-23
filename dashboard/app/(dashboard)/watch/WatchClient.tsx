"use client";

import { useState, useTransition } from "react";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { launchWatchParty, searchTmdbAction, endWatchParty, cancelWatchParty } from "./actions";
import type { ActionResult, TmdbResult, TmdbSearchResponse } from "./actions";

type Party = {
  messageId: string;
  title: string;
  mediaType: string;
  viewingAt: string;
  status: string;
  participants: number;
  avgRating: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "launch" }
  | { type: "end"; party: Party }
  | { type: "cancel"; party: Party };

// ── Launch dialog (2 étapes : recherche TMDB → confirmation) ─────────────────

type FormValues = { title: string; mediaType: string; date: string; time: string };
type LaunchStep = { step: "form" } | { step: "confirm"; tmdb: TmdbResult; fv: FormValues };

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
      const res: ActionResult = await launchWatchParty({
        mediaType: state.fv.mediaType,
        date: state.fv.date,
        time: state.fv.time,
        tmdb: state.tmdb,
      });
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
        <div className="space-y-3 mt-1">
          {/* Film preview */}
          <div className="flex gap-3 rounded-lg bg-muted/40 p-3">
            {tmdb.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tmdb.posterUrl} alt="" className="w-16 rounded shrink-0 object-cover" style={{ aspectRatio: "2/3" }} />
            ) : (
              <div className="w-16 rounded bg-muted shrink-0 flex items-center justify-center" style={{ aspectRatio: "2/3" }}>
                <Plus className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
            <div className="min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <p className="text-sm font-semibold text-foreground">{tmdb.resolvedTitle}</p>
                {tmdb.genres.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{tmdb.genres.join(", ")}</p>
                )}
                {tmdb.overview && (
                  <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-3">{tmdb.overview}</p>
                )}
              </div>
              {(tmdb.director || tmdb.runtime) && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {tmdb.director && `${state.fv.mediaType === "movie" ? "Réalisateur" : "Créateur"} : ${tmdb.director}`}
                  {tmdb.director && tmdb.runtime && " · "}
                  {tmdb.runtime}
                </p>
              )}
            </div>
          </div>
          {/* Date */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Diffusion</span>
            <span className="text-xs font-medium text-foreground">
              {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à {state.fv.time}
            </span>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); setState({ step: "form" }); }}>
            ← Modifier
          </Button>
          <Button size="sm" disabled={pending} onClick={handleLaunch}>
            {pending ? "Publication…" : "Lancer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Lancer une séance</DialogTitle>
        <DialogDescription>Recherchez le titre sur TMDB pour récupérer les infos automatiquement.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Titre</label>
          <Input
            placeholder="Interstellar"
            value={fv.title}
            onChange={e => setFv(v => ({ ...v, title: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <div className="flex gap-2">
            {[{ value: "movie", label: "🎬 Film" }, { value: "tv", label: "📺 Série" }].map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer flex-1">
                <input type="radio" name="mediaType" value={o.value}
                  checked={fv.mediaType === o.value}
                  onChange={() => setFv(v => ({ ...v, mediaType: o.value }))}
                  className="accent-primary" />
                <span className="text-sm text-foreground">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input type="date" value={fv.date} onChange={e => setFv(v => ({ ...v, date: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Heure</label>
            <Input type="time" value={fv.time} onChange={e => setFv(v => ({ ...v, time: e.target.value }))} />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button type="button" size="sm" disabled={pending} onClick={handleSearch}>
          {pending ? "Recherche…" : "Suivant →"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── End dialog ────────────────────────────────────────────────────────────────

function EndDialog({ party, onClose }: { party: Party; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await endWatchParty(party.messageId, party.title);
      if (res.success) onClose(); else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Terminer la séance</DialogTitle>
        <DialogDescription>
          « <span className="font-medium text-foreground">{party.title}</span> » sera marquée comme terminée.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Retour</Button>
        <Button size="sm" disabled={pending} onClick={handle}>
          {pending ? "Enregistrement…" : "Terminer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Cancel dialog ─────────────────────────────────────────────────────────────

function CancelDialog({ party, onClose }: { party: Party; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await cancelWatchParty(party.messageId, party.title);
      if (res.success) onClose(); else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Annuler la séance</DialogTitle>
        <DialogDescription>
          « <span className="font-medium text-foreground">{party.title}</span> » sera supprimée et l'annonce Discord retirée.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Retour</Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={handle}>
          {pending ? "Annulation…" : "Annuler la séance"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Party row ─────────────────────────────────────────────────────────────────

function PartyRow({
  party,
  onEnd,
  onCancel,
}: {
  party: Party;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const isActive = party.status === "active";
  const date = new Date(party.viewingAt);
  const isPast = date < new Date();

  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isActive ? "bg-warning" : "bg-border"}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{party.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {party.mediaType === "movie" ? "Film" : "Série"} · {date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            {party.participants > 0 && ` · ${party.participants} participant${party.participants > 1 ? "s" : ""}`}
            {party.avgRating && ` · ⭐ ${party.avgRating}/5`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        {isActive ? (
          <>
            {isPast && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-emerald-700/30 text-emerald-700 hover:bg-emerald-700/10 hover:text-emerald-700" onClick={onEnd}>
                <CheckCircle className="h-3 w-3" />
                Terminer
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onCancel}>
              <XCircle className="h-3 w-3" />
              Annuler
            </Button>
          </>
        ) : (
          <Badge variant="muted">Terminée</Badge>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function WatchClient({ parties }: { parties: Party[] }) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  function close() { setDialog({ type: "none" }); }

  const active = parties.filter((p) => p.status === "active");
  const ended = parties.filter((p) => p.status !== "active");

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{active.length} en cours · {ended.length} terminée{ended.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => setDialog({ type: "launch" })}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle séance
        </Button>
      </div>

      {parties.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Aucune séance enregistrée.</p>
      ) : (
        <div className="space-y-1">
          {/* Active parties first */}
          {active.map((p) => (
            <PartyRow
              key={p.messageId}
              party={p}
              onEnd={() => setDialog({ type: "end", party: p })}
              onCancel={() => setDialog({ type: "cancel", party: p })}
            />
          ))}
          {/* Divider if both sections have entries */}
          {active.length > 0 && ended.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Terminées</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}
          {ended.map((p) => (
            <PartyRow
              key={p.messageId}
              party={p}
              onEnd={() => setDialog({ type: "end", party: p })}
              onCancel={() => setDialog({ type: "cancel", party: p })}
            />
          ))}
        </div>
      )}

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
