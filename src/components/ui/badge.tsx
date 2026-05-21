import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition-colors",
  {
    variants: {
      variant: {
        default:  "border-white/10 bg-white/[0.04] text-white",
        success:  "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
        warning:  "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]",
        danger:   "border-[var(--color-danger)]/30  bg-[var(--color-danger)]/10  text-[var(--color-danger)]",
        info:     "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
        muted:    "border-white/10 bg-transparent text-[var(--color-muted)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Pulsing dot indicator – pair with Badge for "Online" / "Active" pills. */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-1.5 w-1.5 rounded-full", className)}>
      <span className="absolute inset-0 rounded-full bg-current pulse-dot" />
      <span className="absolute inset-0 rounded-full bg-current" />
    </span>
  );
}
