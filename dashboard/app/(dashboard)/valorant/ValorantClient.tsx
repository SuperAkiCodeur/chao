"use client";

import { useState, useTransition } from "react";
import { Crosshair, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { addValorantAccount, editValorantAccount, deleteValorantAccount } from "./actions";
import type { ActionResult } from "./actions";

type Account = {
  discordUserId: string;
  guildId: string;
  riotId: string;
  puuid: string | null;
  region: string | null;
  linkedAt: string;
};

const BD  = "1px solid rgba(255,255,255,0.08)";
const BDI = "1px solid rgba(255,255,255,0.12)";
const REGIONS = ["eu", "na", "ap", "kr", "br", "latam"];

const REGION_STYLE: Record<string, { color: string; bg: string }> = {
  eu:    { color: "#60a5fa", bg: "rgba(96,165,250,0.13)"  },
  na:    { color: "#f87171", bg: "rgba(248,113,113,0.13)" },
  ap:    { color: "#fbbf24", bg: "rgba(251,191,36,0.13)"  },
  kr:    { color: "#fb7185", bg: "rgba(251,113,133,0.13)" },
  br:    { color: "#4ade80", bg: "rgba(74,222,128,0.13)"  },
  latam: { color: "#f97316", bg: "rgba(249,115,22,0.13)"  },
};

const inputSt: React.CSSProperties = {
  width: "100%", height: 36,
  background: "rgba(255,255,255,0.05)", border: BDI,
  borderRadius: 8, padding: "0 12px",
  fontSize: 14, color: "#fff", outline: "none",
};

const labelSt: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "rgba(255,255,255,0.42)", marginBottom: 6,
};

function BtnCancel({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ padding: "7px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500, border: BDI, background: "transparent", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
      Annuler
    </button>
  );
}

function BtnPrimary({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      style={{ padding: "7px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "none", background: "#fff", color: "#000", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

function BtnDestructive({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ padding: "7px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600, border: "1px solid rgba(239,68,68,0.30)", background: "rgba(239,68,68,0.10)", color: "#ef4444", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

// ── Add dialog ────────────────────────────────────────────────────────────────

function AddDialog({ defaultGuildId, open, onClose }: { defaultGuildId: string; open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result: ActionResult = await addValorantAccount(fd);
      if (result.success) { onClose(); }
      else { setError(result.error); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un compte Valorant</DialogTitle>
          <DialogDescription>Lie un compte Riot à un membre Discord.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <input type="hidden" name="guildId" value={defaultGuildId} />

          <div>
            <label style={labelSt}>Discord User ID</label>
            <input name="discordUserId" placeholder="878583852728189020" required style={inputSt} />
          </div>

          <div>
            <label style={labelSt}>Riot ID</label>
            <input name="riotId" placeholder="Pseudo#TAG" required style={inputSt} />
          </div>

          <div>
            <label style={labelSt}>Région</label>
            <select name="region" style={{ ...inputSt, appearance: "none", cursor: "pointer" }}>
              <option value="">— Sélectionner —</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>

          {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}

          <DialogFooter style={{ marginTop: 4 }}>
            <BtnCancel onClick={onClose} />
            <BtnPrimary disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</BtnPrimary>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditDialog({ account, open, onClose }: { account: Account; open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result: ActionResult = await editValorantAccount(account.discordUserId, account.guildId, fd);
      if (result.success) { onClose(); }
      else { setError(result.error); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le compte</DialogTitle>
          <DialogDescription style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
            {account.discordUserId}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4 }}>
          <div>
            <label style={labelSt}>Riot ID</label>
            <input name="riotId" defaultValue={account.riotId} required style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Région</label>
            <select name="region" defaultValue={account.region ?? ""} style={{ ...inputSt, appearance: "none", cursor: "pointer" }}>
              <option value="">— Sélectionner —</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>
          </div>
          {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
          <DialogFooter style={{ marginTop: 4 }}>
            <BtnCancel onClick={onClose} />
            <BtnPrimary disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</BtnPrimary>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({ account, open, onClose }: { account: Account; open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await deleteValorantAccount(account.discordUserId, account.guildId);
      if (result.success) { onClose(); }
      else { setError(result.error); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le compte</DialogTitle>
          <DialogDescription>
            Le compte{" "}
            <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#fff" }}>{account.riotId}</span>
            {" "}sera délié. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>{error}</p>}
        <DialogFooter style={{ marginTop: 8 }}>
          <BtnCancel onClick={onClose} />
          <BtnDestructive disabled={pending} onClick={handleDelete}>
            {pending ? "Suppression…" : "Supprimer"}
          </BtnDestructive>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type DialogState =
  | { type: "none" }
  | { type: "add" }
  | { type: "edit";   account: Account }
  | { type: "delete"; account: Account };

export function ValorantClient({ accounts, defaultGuildId }: { accounts: Account[]; defaultGuildId: string }) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const close = () => setDialog({ type: "none" });

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: accounts.length > 0 ? 12 : 0 }}>
        <button
          onClick={() => setDialog({ type: "add" })}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: "#fff", color: "#000", border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.30)" }}>
          Aucun compte Valorant lié. Utilisez le bouton "Ajouter" ou la commande{" "}
          <code style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>/valorant link</code>.
        </p>
      )}

      {/* Accounts list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {accounts.map((account, i) => {
          const rs = account.region ? (REGION_STYLE[account.region.toLowerCase()] ?? null) : null;
          return (
            <div
              key={`${account.discordUserId}-${account.guildId}`}
              className="anim-fade-up"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, padding: "11px 0",
                borderTop: i > 0 ? BD : undefined,
                transition: "background 0.12s, transform 0.18s cubic-bezier(0.16,1,0.3,1)",
                animationDelay: `${i * 50}ms`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(3px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              {/* Left: icon + riot id + discord id */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Crosshair size={15} style={{ color: "rgba(255,255,255,0.45)" }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {account.riotId}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", marginTop: 2, fontFamily: "ui-monospace, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {account.discordUserId}
                  </p>
                </div>
              </div>

              {/* Right: region badge + date + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {rs && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                    color: rs.color, background: rs.bg,
                    padding: "2px 8px", borderRadius: 99,
                  }}>
                    {account.region!.toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap" }}>
                  {new Date(account.linkedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <button
                    onClick={() => setDialog({ type: "edit", account })}
                    title="Modifier"
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", transition: "color 0.12s, background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; e.currentTarget.style.background = "none"; }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setDialog({ type: "delete", account })}
                    title="Supprimer"
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.28)", borderRadius: 6, display: "flex", transition: "color 0.12s, background 0.12s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.background = "rgba(239,68,68,0.10)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; e.currentTarget.style.background = "none"; }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      <AddDialog defaultGuildId={defaultGuildId} open={dialog.type === "add"} onClose={close} />

      {dialog.type === "edit" && (
        <EditDialog account={dialog.account} open onClose={close} />
      )}
      {dialog.type === "delete" && (
        <DeleteDialog account={dialog.account} open onClose={close} />
      )}
    </>
  );
}
