"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { Shield, Clock, UserX, UserMinus, Search, ChevronRight, ChevronDown, Check } from "lucide-react";
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
  { label: "1 heure",   value: 3600    },
  { label: "24 heures", value: 86400   },
  { label: "7 jours",   value: 604800  },
  { label: "28 jours",  value: 2419200 },
];

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";

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
  if (color === 0) return "#4e5058";
  return `#${color.toString(16).padStart(6, "0")}`;
}

// ── Shared dialog button styles ───────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
  cursor: "pointer", transition: "opacity 0.15s",
};
function BtnCancel({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ ...btnBase, background: "rgba(255,255,255,0.06)", border: BDI, color: "rgba(255,255,255,0.60)" }}>Annuler</button>;
}
function BtnPrimary({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return <button type={onClick ? "button" : "submit"} disabled={disabled} onClick={onClick} style={{ ...btnBase, background: "#fff", color: "#000", border: "none", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}
function BtnDestructive({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} style={{ ...btnBase, background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>{children}</button>;
}

const inputSt: React.CSSProperties = {
  width: "100%", height: 36,
  background: "rgba(255,255,255,0.05)", border: BDI,
  borderRadius: 8, padding: "0 12px",
  fontSize: 13, color: "#fff", outline: "none",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "rgba(255,255,255,0.42)", marginBottom: 6,
};

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({ label, value, color, divider = true }: { label: string; value: string; color?: string; divider?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "14px 20px", borderTop: divider ? BD : undefined }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 500, color: color ?? "#fff", fontFamily: label === "Discord ID" ? "ui-monospace, monospace" : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", maxWidth: "58%" }}>
        {value}
      </span>
    </div>
  );
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
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {memberRoles.map((r) => {
        const c = roleColor(r.color);
        return (
          <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600, backgroundColor: `${c}22`, color: c }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: c, flexShrink: 0 }} />
            {r.name}
          </span>
        );
      })}
    </div>
  );
}

// ── Detail dialog ─────────────────────────────────────────────────────────────

function DetailDialog({
  member, roles, onClose, onAction,
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

  const infoRows: { label: string; value: string; color?: string }[] = [
    { label: "Discord ID",    value: member.user.id },
    { label: "A rejoint le",  value: new Date(member.joined_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) },
    { label: "Compte créé le",value: createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) },
  ];
  if (timedOut) {
    infoRows.push({
      label: "Sourdine jusqu'au",
      value: new Date(member.communication_disabled_until!).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
      color: "#fbbf24",
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(member)} alt=""
            style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", objectFit: "cover" }}
            onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
          />
          <div style={{ minWidth: 0 }}>
            <DialogTitle style={{ fontSize: 18, fontWeight: 700 }}>{displayName(member)}</DialogTitle>
            <DialogDescription style={{ fontSize: 12, marginTop: 4 }}>@{member.user.username}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Info rows — premier sans borderTop pour éviter le double trait */}
        <div style={{ borderRadius: 10, border: BD, overflow: "hidden" }}>
          {infoRows.map((row, i) => (
            <InfoRow key={row.label} label={row.label} value={row.value} color={row.color} divider={i > 0} />
          ))}
        </div>

        {/* Roles */}
        {memberRoles.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.40)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Rôles ({memberRoles.length})
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {memberRoles.map((r) => {
                const c = roleColor(r.color);
                return (
                  <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6, padding: "4px 11px", fontSize: 12, fontWeight: 600, backgroundColor: `${c}22`, color: c }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: c, flexShrink: 0 }} />
                    {r.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Gérer les rôles */}
          <button
            onClick={() => { onClose(); onAction("roles"); }}
            style={{ ...btnBase, width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.08)", border: BD, color: "#fff", fontSize: 13 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
          >
            <Shield size={14} />
            Gérer les rôles
          </button>

          {/* Moderation row */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Sourdine", icon: <Clock size={13} />, color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.28)", action: "timeout" as const },
              { label: "Expulser", icon: <UserMinus size={13} />, color: "#f97316", bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.28)", action: "kick" as const },
              { label: "Bannir",   icon: <UserX size={13} />,    color: "#ef4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)",  action: "ban" as const },
            ].map(({ label, icon, color, bg, border, action }) => (
              <button
                key={action}
                onClick={() => { onClose(); onAction(action); }}
                style={{ ...btnBase, flex: 1, padding: "12px 8px", background: bg, border: `1px solid ${border}`, color, fontSize: 12 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.80"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </DialogContent>
  );
}

// ── Moderation dialogs ────────────────────────────────────────────────────────

function ReasonField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={labelSt}>Raison (optionnelle)</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Raison…" style={inputSt}
      />
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
      if (res.success) onClose(); else setError(res.error);
    });
  }
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Expulser {displayName(member)}</DialogTitle>
        <DialogDescription>Le membre pourra rejoindre à nouveau avec une invitation.</DialogDescription>
      </DialogHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <ReasonField value={reason} onChange={setReason} />
        {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
      </div>
      <DialogFooter style={{ marginTop: 4 }}>
        <BtnCancel onClick={onClose} />
        <BtnDestructive disabled={pending} onClick={handle}>{pending ? "Expulsion…" : "Expulser"}</BtnDestructive>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <ReasonField value={reason} onChange={setReason} />
        {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
      </div>
      <DialogFooter style={{ marginTop: 4 }}>
        <BtnCancel onClick={onClose} />
        <BtnDestructive disabled={pending} onClick={handle}>{pending ? "Bannissement…" : "Bannir"}</BtnDestructive>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        <div>
          <label style={labelSt}>Durée</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ ...inputSt, appearance: "none", cursor: "pointer" }}
          >
            {TIMEOUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <ReasonField value={reason} onChange={setReason} />
        {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
      </div>
      <DialogFooter style={{ marginTop: 4 }}>
        <BtnCancel onClick={onClose} />
        <BtnPrimary disabled={pending} onClick={handle}>{pending ? "Application…" : "Appliquer"}</BtnPrimary>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Roles editor dialog ───────────────────────────────────────────────────────

function RolesDialog({ member, roles, onClose }: { member: DiscordMember; roles: DiscordRole[]; onClose: () => void }) {
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

      <div style={{ maxHeight: 280, overflowY: "auto", margin: "4px 0" }}>
        {manageable.map((r) => {
          const color = roleColor(r.color);
          const checked = selected.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "9px 4px", background: "none", border: "none", cursor: "pointer", borderRadius: 8, transition: "background 0.12s", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {/* Checkbox */}
              <div style={{ width: 16, height: 16, borderRadius: 4, border: checked ? "none" : "2px solid rgba(255,255,255,0.22)", background: checked ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s, border 0.15s" }}>
                {checked && <Check size={10} style={{ color: "#000" }} />}
              </div>
              {/* Dot */}
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
              {/* Name */}
              <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: r.color !== 0 ? color : "rgba(255,255,255,0.80)" }}>
                {r.name}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}

      <DialogFooter>
        <BtnCancel onClick={onClose} />
        <BtnPrimary disabled={pending} onClick={handle}>{pending ? "Enregistrement…" : "Enregistrer"}</BtnPrimary>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Role dropdown ─────────────────────────────────────────────────────────────

function RoleDropdown({ roles, value, onChange }: { roles: DiscordRole[]; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [animClass, setAnimClass] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = roles.find((r) => r.id === value);

  function doOpen()  { setVisible(true);  setAnimClass("animate-expand-down"); }
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
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => visible ? doClose() : doOpen()}
        style={{ height: 36, display: "flex", alignItems: "center", gap: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)", paddingLeft: 12, paddingRight: 10, fontSize: 14, color: "#fff", whiteSpace: "nowrap", cursor: "pointer", transition: "border-color 0.15s" }}
      >
        {selected ? (
          <>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: roleColor(selected.color), flexShrink: 0 }} />
            <span style={{ color: roleColor(selected.color) }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.50)" }}>Tous les rôles</span>
        )}
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.45)", marginLeft: 2, transform: visible && animClass !== "animate-expand-up" ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
      </button>

      {visible && (
        <div
          className={animClass}
          onAnimationEnd={handleAnimEnd}
          style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 50, minWidth: 180, borderRadius: 10, border: BDI, background: "#2a2a2a", boxShadow: "0 12px 36px rgba(0,0,0,0.40)", padding: "4px 0" }}
        >
          <button type="button" onClick={() => { onChange(""); doClose(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.45)" }}
          >
            <span style={{ flex: 1, textAlign: "left" }}>Tous les rôles</span>
            {!value && <Check size={12} style={{ color: "#fff" }} />}
          </button>
          <div style={{ margin: "2px 0", height: 1, background: "rgba(255,255,255,0.07)" }} />
          {roles.map((r) => (
            <button key={r.id} type="button" onClick={() => { onChange(r.id); doClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: roleColor(r.color), flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: "left", color: roleColor(r.color) }}>{r.name}</span>
              {value === r.id && <Check size={12} style={{ color: "#fff" }} />}
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
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(255,255,255,0.38)", pointerEvents: "none" }} />
          <input
            style={{ width: "100%", height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, paddingLeft: 36, paddingRight: 12, fontSize: 13, color: "#fff", outline: "none" }}
            placeholder="Rechercher un membre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <RoleDropdown roles={assignedRoles} value={roleFilter} onChange={setRoleFilter} />
      </div>

      {/* Active filter indicator */}
      {roleFilter && selectedRole && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px 0" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Filtré par :</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 500, backgroundColor: `${roleColor(selectedRole.color)}22`, color: roleColor(selectedRole.color) }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: roleColor(selectedRole.color) }} />
            {selectedRole.name}
          </span>
          <button onClick={() => setRoleFilter("")} style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>— {filtered.length} membre{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* List */}
      <div>
        {filtered.length === 0 && (
          <p style={{ padding: "16px 20px", fontSize: 13, color: "rgba(255,255,255,0.30)" }}>Aucun membre trouvé.</p>
        )}
        {filtered.map((m) => {
          const timedOut = isTimedOut(m);
          return (
            <div
              key={m.user.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", cursor: "pointer", transition: "background 0.12s, transform 0.18s cubic-bezier(0.16,1,0.3,1)" }}
              onClick={() => setDialog({ type: "detail", member: m })}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "translateX(3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "none"; }}
            >
              {/* Left: avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(m)} alt=""
                  style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", objectFit: "cover" }}
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1 }}>{displayName(m)}</p>
                    {timedOut && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "1px 6px", borderRadius: 99, flexShrink: 0 }}>sourdine</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>@{m.user.username}</p>
                </div>
              </div>

              {/* Right: role pills + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <RolePills roleIds={m.roles} roles={roles} max={2} />
                <div style={{ display: "flex", alignItems: "center", gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); setDialog({ type: "timeout", member: m }); }}
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", transition: "color 0.12s" }}
                    title="Mettre en sourdine"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#fbbf24"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
                  ><Clock size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDialog({ type: "kick", member: m }); }}
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", transition: "color 0.12s" }}
                    title="Expulser"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f97316"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
                  ><UserMinus size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setDialog({ type: "ban", member: m }); }}
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", transition: "color 0.12s" }}
                    title="Bannir"
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
                  ><UserX size={14} /></button>
                  <ChevronRight size={14} style={{ color: "rgba(255,255,255,0.18)", marginLeft: 2 }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <Dialog open={dialog.type === "detail"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "detail" && <DetailDialog member={dialog.member} roles={roles} onClose={close} onAction={(type) => setDialog({ type, member: dialog.member })} />}
      </Dialog>
      <Dialog open={dialog.type === "roles"} onOpenChange={(o) => !o && close()}>
        {dialog.type === "roles" && <RolesDialog member={dialog.member} roles={roles} onClose={close} />}
      </Dialog>
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
