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
import { launchWatchParty, endWatchParty, cancelWatchParty } from "./actions";
import type { ActionResult } from "./actions";

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

// ── Launch dialog ─────────────────────────────────────────────────────────────

function LaunchDialog({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Default to tomorrow at 21:00
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  function handle(formData: FormData) {
    setError(null);
    start(async () => {
      const res: ActionResult = await launchWatchParty(formData);
      if (res.success) onClose(); else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Lancer une séance</DialogTitle>
        <DialogDescription>
          Une annonce sera postée sur Discord et la séance sera enregistrée.
        </DialogDescription>
      </DialogHeader>
      <form action={handle} className="space-y-3 mt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Titre</label>
          <Input name="title" placeholder="Interstellar" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Type</label>
          <div className="flex gap-2">
            {[{ value: "movie", label: "🎬 Film" }, { value: "tv", label: "📺 Série" }].map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer flex-1">
                <input type="radio" name="mediaType" value={o.value} defaultChecked={o.value === "movie"} className="accent-primary" />
                <span className="text-sm text-foreground">{o.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <Input name="date" type="date" defaultValue={defaultDate} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Heure</label>
            <Input name="time" type="time" defaultValue="21:00" required />
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Publication…" : "Lancer"}
          </Button>
        </DialogFooter>
      </form>
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
    <div className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-muted/40 transition-colors">
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
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-400" onClick={onEnd}>
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
