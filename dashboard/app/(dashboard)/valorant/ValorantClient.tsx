"use client";

import { useState, useTransition } from "react";
import { Crosshair, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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

const REGION_COLORS: Record<string, string> = {
  eu: "text-blue-400",
  na: "text-red-400",
  ap: "text-yellow-400",
  kr: "text-pink-400",
  br: "text-green-400",
  latam: "text-orange-400",
};

const REGIONS = ["eu", "na", "ap", "kr", "br", "latam"];

// ── Add dialog ────────────────────────────────────────────────────────────────

function AddDialog({ defaultGuildId }: { defaultGuildId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await addValorantAccount(formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Ajouter
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un compte Valorant</DialogTitle>
            <DialogDescription>Lie un compte Riot à un membre Discord.</DialogDescription>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <input type="hidden" name="guildId" value={defaultGuildId} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Discord User ID</label>
              <Input name="discordUserId" placeholder="878583852728189020" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Riot ID</label>
              <Input name="riotId" placeholder="Pseudo#TAG" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Région</label>
              <select
                name="region"
                className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— Sélectionner —</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="sm">Annuler</Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Ajout…" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Edit dialog ───────────────────────────────────────────────────────────────

function EditDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await editValorantAccount(
        account.discordUserId,
        account.guildId,
        formData,
      );
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Modifier le compte</DialogTitle>
        <DialogDescription>Discord ID : {account.discordUserId}</DialogDescription>
      </DialogHeader>
      <form action={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Riot ID</label>
          <Input name="riotId" defaultValue={account.riotId} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Région</label>
          <select
            name="region"
            defaultValue={account.region ?? ""}
            className="flex h-9 w-full rounded-lg border border-border bg-muted/40 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Sélectionner —</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r.toUpperCase()}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ── Delete dialog ─────────────────────────────────────────────────────────────

function DeleteDialog({ account, onClose }: { account: Account; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await deleteValorantAccount(
        account.discordUserId,
        account.guildId,
      );
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Supprimer le compte</DialogTitle>
        <DialogDescription>
          Cette action est irréversible. Le compte{" "}
          <span className="font-mono font-semibold text-foreground">{account.riotId}</span>{" "}
          sera délié.
        </DialogDescription>
      </DialogHeader>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>Annuler</Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={handleDelete}
        >
          {pending ? "Suppression…" : "Supprimer"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

type DialogState =
  | { type: "none" }
  | { type: "edit"; account: Account }
  | { type: "delete"; account: Account };

export function ValorantClient({ accounts, defaultGuildId }: { accounts: Account[]; defaultGuildId: string }) {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });

  return (
    <>
      {/* Add button */}
      <AddDialog defaultGuildId={defaultGuildId} />

      {/* Accounts list */}
      <div className="space-y-1 mt-2">
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Aucun compte Valorant lié. Utilisez le bouton "Ajouter" ou la commande{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">/valorant link</code>.
          </p>
        ) : (
          accounts.map((account) => (
            <div
              key={`${account.discordUserId}-${account.guildId}`}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Crosshair className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm font-medium text-foreground">{account.riotId}</span>
                <span className="text-xs text-muted-foreground hidden sm:block font-mono">
                  {account.discordUserId}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                {account.region && (
                  <span className={`text-xs font-semibold uppercase ${REGION_COLORS[account.region.toLowerCase()] ?? "text-muted-foreground"}`}>
                    {account.region.toUpperCase()}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(account.linkedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                {/* Action buttons — visible on hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setDialog({ type: "edit", account })}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDialog({ type: "delete", account })}
                    className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Delete dialogs */}
      <Dialog
        open={dialog.type === "edit"}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
      >
        {dialog.type === "edit" && (
          <EditDialog account={dialog.account} onClose={() => setDialog({ type: "none" })} />
        )}
      </Dialog>

      <Dialog
        open={dialog.type === "delete"}
        onOpenChange={(open) => !open && setDialog({ type: "none" })}
      >
        {dialog.type === "delete" && (
          <DeleteDialog account={dialog.account} onClose={() => setDialog({ type: "none" })} />
        )}
      </Dialog>
    </>
  );
}
