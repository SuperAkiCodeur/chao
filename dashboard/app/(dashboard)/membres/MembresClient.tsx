"use client";

import { useState, useTransition, useMemo } from "react";
import { Shield, Clock, UserX, UserMinus, Search } from "lucide-react";
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
import { kickMember, banMember, timeoutMember } from "./actions";
import type { ActionResult } from "./actions";

export type DiscordMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
  joined_at: string;
  communication_disabled_until: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "kick"; member: DiscordMember }
  | { type: "ban"; member: DiscordMember }
  | { type: "timeout"; member: DiscordMember };

const TIMEOUT_OPTIONS = [
  { label: "1 heure", value: 3600 },
  { label: "24 heures", value: 86400 },
  { label: "7 jours", value: 604800 },
  { label: "28 jours", value: 2419200 },
];

function displayName(m: DiscordMember) {
  return m.nick ?? m.user.global_name ?? m.user.username;
}

function avatarUrl(m: DiscordMember) {
  if (m.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.webp?size=64`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(m.user.id) >> BigInt(22)) % 6}.png`;
}

function isTimedOut(m: DiscordMember) {
  return m.communication_disabled_until && new Date(m.communication_disabled_until) > new Date();
}

// ── Moderation dialogs ────────────────────────────────────────────────────────

function ReasonInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Raison (optionnelle)</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Raison…" />
    </div>
  );
}

function KickDialog({ member, onClose }: { member: DiscordMember; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await kickMember(member.user.id, displayName(member), reason);
      if (res.success) onClose();
      else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Expulser {displayName(member)}</DialogTitle>
        <DialogDescription>Le membre pourra rejoindre à nouveau avec une invitation.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <ReasonInput value={reason} onChange={setReason} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={handle}>
          {pending ? "Expulsion…" : "Expulser"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function BanDialog({ member, onClose }: { member: DiscordMember; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await banMember(member.user.id, displayName(member), reason);
      if (res.success) onClose();
      else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Bannir {displayName(member)}</DialogTitle>
        <DialogDescription>Le membre ne pourra plus rejoindre le serveur.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <ReasonInput value={reason} onChange={setReason} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={handle}>
          {pending ? "Bannissement…" : "Bannir"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TimeoutDialog({ member, onClose }: { member: DiscordMember; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(3600);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await timeoutMember(member.user.id, displayName(member), duration, reason);
      if (res.success) onClose();
      else setError(res.error);
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Mettre en sourdine {displayName(member)}</DialogTitle>
        <DialogDescription>Le membre ne pourra pas écrire pendant la durée choisie.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Durée</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {TIMEOUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <ReasonInput value={reason} onChange={setReason} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" disabled={pending} onClick={handle}>
          {pending ? "Application…" : "Appliquer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MembresClient({ members }: { members: DiscordMember[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase();
    return members.filter((m) => displayName(m).toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q));
  }, [members, query]);

  function close() { setDialog({ type: "none" }); }

  return (
    <>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher un membre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">Aucun membre trouvé.</p>
        )}
        {filtered.map((m) => {
          const timedOut = isTimedOut(m);
          return (
            <div
              key={m.user.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(m)}
                  alt=""
                  className="h-8 w-8 rounded-full shrink-0 bg-muted"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                />
                <div>
                  <p className="text-sm font-medium text-foreground leading-none">{displayName(m)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@{m.user.username}</p>
                </div>
                {timedOut && (
                  <Badge variant="warning" className="hidden sm:inline-flex">En sourdine</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Rejoint le {new Date(m.joined_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {/* Actions — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setDialog({ type: "timeout", member: m })}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                    title="Mettre en sourdine"
                  >
                    <Clock className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDialog({ type: "kick", member: m })}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                    title="Expulser"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDialog({ type: "ban", member: m })}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Bannir"
                  >
                    <UserX className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={dialog.type === "kick"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "kick" && <KickDialog member={dialog.member} onClose={close} />}
      </Dialog>
      <Dialog open={dialog.type === "ban"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "ban" && <BanDialog member={dialog.member} onClose={close} />}
      </Dialog>
      <Dialog open={dialog.type === "timeout"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "timeout" && <TimeoutDialog member={dialog.member} onClose={close} />}
      </Dialog>
    </>
  );
}
