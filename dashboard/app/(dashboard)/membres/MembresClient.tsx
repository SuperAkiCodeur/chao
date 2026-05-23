"use client";

import { useState, useTransition, useMemo } from "react";
import { Shield, Clock, UserX, UserMinus, Search, ChevronRight } from "lucide-react";
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

export type DiscordRole = {
  id: string;
  name: string;
  color: number;
  position: number;
};

export type DiscordMember = {
  user: { id: string; username: string; global_name: string | null; avatar: string | null };
  nick: string | null;
  roles: string[];
  joined_at: string;
  communication_disabled_until: string | null;
};

type DialogState =
  | { type: "none" }
  | { type: "detail"; member: DiscordMember }
  | { type: "kick"; member: DiscordMember }
  | { type: "ban"; member: DiscordMember }
  | { type: "timeout"; member: DiscordMember };

const TIMEOUT_OPTIONS = [
  { label: "1 heure", value: 3600 },
  { label: "24 heures", value: 86400 },
  { label: "7 jours", value: 604800 },
  { label: "28 jours", value: 2419200 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function displayName(m: DiscordMember) {
  return m.nick ?? m.user.global_name ?? m.user.username;
}

function avatarUrl(m: DiscordMember) {
  if (m.user.avatar) {
    return `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.webp?size=128`;
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(m.user.id) >> BigInt(22)) % 6}.png`;
}

function isTimedOut(m: DiscordMember) {
  return m.communication_disabled_until && new Date(m.communication_disabled_until) > new Date();
}

function snowflakeToDate(id: string): Date {
  return new Date(Number((BigInt(id) >> BigInt(22)) + BigInt(1420070400000)));
}

function roleColor(color: number): string {
  if (color === 0) return "#4e5058"; // Discord default grey
  return `#${color.toString(16).padStart(6, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RolePills({ roleIds, roles, max = 3 }: { roleIds: string[]; roles: DiscordRole[]; max?: number }) {
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const memberRoles = roleIds
    .map((id) => roleMap.get(id))
    .filter((r): r is DiscordRole => !!r && r.name !== "@everyone" && r.color !== 0)
    .sort((a, b) => b.position - a.position)
    .slice(0, max);

  if (memberRoles.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {memberRoles.map((r) => (
        <span
          key={r.id}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: `${roleColor(r.color)}20`, color: roleColor(r.color) }}
        >
          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: roleColor(r.color) }} />
          {r.name}
        </span>
      ))}
    </div>
  );
}

function ReasonInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">Raison (optionnelle)</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Raison…" />
    </div>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

function DetailDialog({
  member,
  roles,
  onClose,
  onAction,
}: {
  member: DiscordMember;
  roles: DiscordRole[];
  onClose: () => void;
  onAction: (type: "kick" | "ban" | "timeout") => void;
}) {
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const memberRoles = member.roles
    .map((id) => roleMap.get(id))
    .filter((r): r is DiscordRole => !!r && r.name !== "@everyone")
    .sort((a, b) => b.position - a.position);

  const timedOut = isTimedOut(member);
  const createdAt = snowflakeToDate(member.user.id);

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <div className="flex items-center gap-3 mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(member)}
            alt=""
            className="h-12 w-12 rounded-full bg-muted shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
          />
          <div>
            <DialogTitle className="text-base">{displayName(member)}</DialogTitle>
            <DialogDescription className="text-xs">@{member.user.username}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-3">
        {/* Info rows */}
        <div className="rounded-lg bg-muted/40 divide-y divide-border overflow-hidden">
          <Row label="Discord ID" value={<span className="font-mono text-xs">{member.user.id}</span>} />
          <Row
            label="A rejoint le"
            value={new Date(member.joined_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          />
          <Row
            label="Compte créé le"
            value={createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
          />
          {timedOut && (
            <Row
              label="Sourdine jusqu'au"
              value={
                <span className="text-yellow-400">
                  {new Date(member.communication_disabled_until!).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              }
            />
          )}
        </div>

        {/* Roles */}
        {memberRoles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Rôles ({memberRoles.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {memberRoles.map((r) => (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${roleColor(r.color)}20`, color: roleColor(r.color) }}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: roleColor(r.color) }} />
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-yellow-500/30 text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-400"
            onClick={() => { onClose(); onAction("timeout"); }}
          >
            <Clock className="h-3.5 w-3.5" />
            Sourdine
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-orange-500/30 text-orange-400 hover:bg-orange-400/10 hover:text-orange-400"
            onClick={() => { onClose(); onAction("kick"); }}
          >
            <UserMinus className="h-3.5 w-3.5" />
            Expulser
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => { onClose(); onAction("ban"); }}
          >
            <UserX className="h-3.5 w-3.5" />
            Bannir
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

// ── Moderation dialogs ────────────────────────────────────────────────────────

function KickDialog({ member, onClose }: { member: DiscordMember; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await kickMember(member.user.id, displayName(member), reason);
      if (res.success) onClose(); else setError(res.error);
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
      if (res.success) onClose(); else setError(res.error);
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
      if (res.success) onClose(); else setError(res.error);
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

export function MembresClient({ members, roles }: { members: DiscordMember[]; roles: DiscordRole[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  const filtered = useMemo(() => {
    if (!query.trim()) return members;
    const q = query.toLowerCase();
    return members.filter(
      (m) => displayName(m).toLowerCase().includes(q) || m.user.username.toLowerCase().includes(q),
    );
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
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => setDialog({ type: "detail", member: m })}
            >
              {/* Left: avatar + name + roles */}
              <div className="flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(m)}
                  alt=""
                  className="h-8 w-8 rounded-full shrink-0 bg-muted"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground leading-none truncate">{displayName(m)}</p>
                    {timedOut && <Badge variant="warning" className="text-[10px] px-1.5 py-0">sourdine</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">@{m.user.username}</p>
                    <RolePills roleIds={m.roles} roles={roles} max={2} />
                  </div>
                </div>
              </div>

              {/* Right: action buttons + chevron */}
              <div className="flex items-center gap-1 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "timeout", member: m }); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                  title="Mettre en sourdine"
                >
                  <Clock className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "kick", member: m }); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10 transition-colors"
                  title="Expulser"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "ban", member: m }); }}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Bannir"
                >
                  <UserX className="h-3.5 w-3.5" />
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-1" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={dialog.type === "detail"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "detail" && (
          <DetailDialog
            member={dialog.member}
            roles={roles}
            onClose={close}
            onAction={(type) => setDialog({ type, member: dialog.member })}
          />
        )}
      </Dialog>

      {/* Moderation dialogs */}
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
