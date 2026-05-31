"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { Shield, Clock, UserX, UserMinus, Search, ChevronRight, ChevronDown, Check } from "lucide-react";
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
import { kickMember, banMember, timeoutMember, updateMemberRoles } from "./actions";
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
  | { type: "timeout"; member: DiscordMember }
  | { type: "roles"; member: DiscordMember };

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
  onAction: (type: "kick" | "ban" | "timeout" | "roles") => void;
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
                <span className="text-amber-600">
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
        <div className="space-y-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => { onClose(); onAction("roles"); }}
          >
            <Shield className="h-3.5 w-3.5" />
            Gérer les rôles
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-amber-600/30 text-amber-600 hover:bg-amber-600/10 hover:text-amber-600"
              onClick={() => { onClose(); onAction("timeout"); }}
            >
              <Clock className="h-3.5 w-3.5" />
              Sourdine
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-orange-600/30 text-orange-600 hover:bg-orange-600/10 hover:text-orange-600"
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

// ── Roles editor dialog ───────────────────────────────────────────────────────

function RolesDialog({
  member,
  roles,
  onClose,
}: {
  member: DiscordMember;
  roles: DiscordRole[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(member.roles));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const manageable = roles
    .filter((r) => r.name !== "@everyone")
    .sort((a, b) => b.position - a.position);

  function toggle(roleId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId); else next.add(roleId);
      return next;
    });
  }

  function handle() {
    setError(null);
    start(async () => {
      const res: ActionResult = await updateMemberRoles(member.user.id, displayName(member), [...selected]);
      if (res.success) onClose(); else setError(res.error);
    });
  }

  return (
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle>Rôles — {displayName(member)}</DialogTitle>
        <DialogDescription>Cochez ou décochez les rôles à attribuer.</DialogDescription>
      </DialogHeader>

      <div className="max-h-72 overflow-y-auto space-y-0.5 py-1">
        {manageable.map((r) => {
          const color = roleColor(r.color);
          const checked = selected.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors text-left"
            >
              {/* Checkbox */}
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                checked ? "border-primary bg-primary" : "border-border bg-transparent"
              }`}>
                {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
              </div>
              {/* Color dot */}
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              {/* Name */}
              <span className="text-sm flex-1 truncate" style={{ color: r.color !== 0 ? color : undefined }}>
                {r.name}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button size="sm" disabled={pending} onClick={handle}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Role dropdown ─────────────────────────────────────────────────────────────

function RoleDropdown({
  roles,
  value,
  onChange,
}: {
  roles: DiscordRole[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = roles.find((r) => r.id === value);

  function doOpen() { setVisible(true); setAnimClass("animate-expand-down"); }
  function doClose() { if (visible) setAnimClass("animate-expand-up"); }
  function handleAnimEnd() {
    if (animClass === "animate-expand-up") setVisible(false);
    setAnimClass("");
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) doClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => visible ? doClose() : doOpen()}
        style={{ height: 36, display: "flex", alignItems: "center", gap: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", paddingLeft: 12, paddingRight: 10, fontSize: 14, color: "#fff", whiteSpace: "nowrap", cursor: "pointer", transition: "border-color 0.15s" }}
      >
        {selected ? (
          <>
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: roleColor(selected.color) }} />
            <span style={{ color: roleColor(selected.color) }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.50)" }}>Tous les rôles</span>
        )}
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.45)", marginLeft: 2, transform: visible && animClass !== "animate-expand-up" ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {visible && (
        <div
          className={`absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border bg-card shadow-xl py-1 ${animClass}`}
          onAnimationEnd={handleAnimEnd}
        >
          <button
            type="button"
            onClick={() => { onChange(""); doClose(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150"
          >
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
            <span className="text-muted-foreground flex-1 text-left">Tous les rôles</span>
            {!value && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>

          {roles.length > 0 && <div className="my-1 border-t border-border" />}

          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => { onChange(r.id); doClose(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/40 hover:translate-x-0.5 transition-all duration-150"
            >
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: roleColor(r.color) }} />
              <span className="flex-1 text-left text-foreground">{r.name}</span>
              {value === r.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MembresClient({ members, roles }: { members: DiscordMember[]; roles: DiscordRole[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  // Build list of roles that at least one member has (excluding @everyone)
  const assignedRoles = useMemo(() => {
    const memberRoleIds = new Set(members.flatMap((m) => m.roles));
    return roles
      .filter((r) => r.name !== "@everyone" && memberRoleIds.has(r.id))
      .sort((a, b) => b.position - a.position);
  }, [members, roles]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchQuery = !query.trim() ||
        displayName(m).toLowerCase().includes(query.toLowerCase()) ||
        m.user.username.toLowerCase().includes(query.toLowerCase());
      const matchRole = !roleFilter || m.roles.includes(roleFilter);
      return matchQuery && matchRole;
    });
  }, [members, query, roleFilter]);

  function close() { setDialog({ type: "none" }); }

  const selectedRole = assignedRoles.find((r) => r.id === roleFilter);

  return (
    <>
      {/* Search + role filter */}
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(255,255,255,0.38)", pointerEvents: "none", flexShrink: 0 }} />
          <input
            style={{ width: "100%", height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, paddingLeft: 36, paddingRight: 12, fontSize: 13, color: "#fff", outline: "none" }}
            placeholder="Rechercher un membre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <RoleDropdown
          roles={assignedRoles}
          value={roleFilter}
          onChange={setRoleFilter}
        />
      </div>

      {/* Active filter indicator */}
      {roleFilter && selectedRole && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px 0" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Filtré par :</span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 500, backgroundColor: `${roleColor(selectedRole.color)}20`, color: roleColor(selectedRole.color) }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: roleColor(selectedRole.color) }} />
            {selectedRole.name}
          </span>
          <button onClick={() => setRoleFilter("")} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>— {filtered.length} membre{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* List */}
      <div style={{ padding: "6px 0" }}>
        {filtered.length === 0 && (
          <p style={{ padding: "16px 20px", fontSize: 13, color: "rgba(255,255,255,0.30)" }}>Aucun membre trouvé.</p>
        )}
        {filtered.map((m) => {
          const timedOut = isTimedOut(m);
          return (
            <div
              key={m.user.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", cursor: "pointer", transition: "background 0.12s" }}
              onClick={() => setDialog({ type: "detail", member: m })}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Left: avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(m)}
                  alt=""
                  style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>{displayName(m)}</p>
                    {timedOut && <Badge variant="warning" className="text-[10px] px-1.5 py-0">sourdine</Badge>}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>@{m.user.username}</p>
                </div>
              </div>

              {/* Right: action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginLeft: 12 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "timeout", member: m }); }}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", borderRadius: 6, display: "flex" }}
                  title="Mettre en sourdine"
                >
                  <Clock size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "kick", member: m }); }}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", borderRadius: 6, display: "flex" }}
                  title="Expulser"
                >
                  <UserMinus size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDialog({ type: "ban", member: m }); }}
                  style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.30)", borderRadius: 6, display: "flex" }}
                  title="Bannir"
                >
                  <UserX size={14} />
                </button>
                <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.18)", marginLeft: 4 }} />
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

      {/* Roles dialog */}
      <Dialog open={dialog.type === "roles"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "roles" && (
          <RolesDialog member={dialog.member} roles={roles} onClose={close} />
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
