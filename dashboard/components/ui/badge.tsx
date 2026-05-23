import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-primary/15 text-primary border border-primary/20",
        secondary: "bg-secondary text-secondary-foreground border border-border",
        destructive: "bg-destructive/15 text-destructive border border-destructive/20",
        outline:   "border border-border text-foreground",
        success:   "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        warning:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
        muted:     "bg-muted text-muted-foreground border border-border",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
