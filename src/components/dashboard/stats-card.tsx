import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IconType } from "react-icons";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

interface StatsCardProps {
  label: string;
  value: string | number;
  delta?: number;          // e.g. +12.4  /  -3.1
  deltaLabel?: string;     // "vs last shift"
  icon: IconType;
  tone?: "default" | "success" | "warning" | "danger";
}

const TONE_CLASSES = {
  default: "text-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-[var(--color-primary)]/20",
  success: "text-[var(--color-success)] bg-[var(--color-success)]/10 ring-[var(--color-success)]/20",
  warning: "text-[var(--color-warning)] bg-[var(--color-warning)]/10 ring-[var(--color-warning)]/20",
  danger:  "text-[var(--color-danger)]  bg-[var(--color-danger)]/10  ring-[var(--color-danger)]/20",
} as const;

export function StatsCard({
  label, value, delta, deltaLabel, icon: Icon, tone = "default",
}: StatsCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card className="relative overflow-hidden p-5">
      {/* faint corner glow */}
      <div
        aria-hidden
        className={cn(
          "absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-30 blur-2xl",
          tone === "success" && "bg-[var(--color-success)]",
          tone === "warning" && "bg-[var(--color-warning)]",
          tone === "danger"  && "bg-[var(--color-danger)]",
          tone === "default" && "bg-[var(--color-primary)]"
        )}
      />

      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
        </div>

        <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1", TONE_CLASSES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {typeof delta === "number" && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          {positive ? (
            <FiTrendingUp className="h-3.5 w-3.5 text-[var(--color-success)]" />
          ) : (
            <FiTrendingDown className="h-3.5 w-3.5 text-[var(--color-danger)]" />
          )}
          <span className={cn(positive ? "text-[var(--color-success)]" : "text-[var(--color-danger)]", "font-medium")}>
            {positive ? "+" : ""}{delta}%
          </span>
          {deltaLabel && <span className="text-[var(--color-muted)]">{deltaLabel}</span>}
        </div>
      )}
    </Card>
  );
}
