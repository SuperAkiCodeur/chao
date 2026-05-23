"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { clearCemantixHistory } from "./actions";

export function ClearHistoryButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function handle() {
    start(async () => {
      await clearCemantixHistory();
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3 w-3" />
        Vider
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vider l&apos;historique</DialogTitle>
            <DialogDescription>
              Toutes les parties, le classement et les tops mots seront supprimés définitivement. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" disabled={pending} onClick={handle}>
              {pending ? "Suppression…" : "Vider l'historique"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
