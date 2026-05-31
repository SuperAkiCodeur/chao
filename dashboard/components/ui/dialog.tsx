"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm dialog-overlay", className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl dialog-content",
        className,
      )}
      style={{ padding: 20, ...style }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="rounded-md text-muted-foreground transition-colors hover:text-foreground focus:outline-none" style={{ position: "absolute", right: 20, top: 20, padding: 4 }}>
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 6, ...style }} {...props} />;
}

function DialogTitle({ className, style, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={className} style={{ fontSize: 15, fontWeight: 700, color: "#fff", ...style }} {...props} />;
}

function DialogDescription({ className, style, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={className} style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4, ...style }} {...props} />;
}

function DialogFooter({ className, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} style={{ marginTop: 32, display: "flex", justifyContent: "flex-end", gap: 12, ...style }} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
