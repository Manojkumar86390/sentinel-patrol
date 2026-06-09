"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/utils";
import { FiTarget, FiCheckCircle, FiClock, FiXCircle, FiChevronDown, FiChevronRight } from "react-icons/fi";
import type { ComplianceSummary, ComplianceSlot } from "@/types";

const STATUS_VARIANT: Record<ComplianceSlot["status"], "success" | "warning" | "danger" | "info"> = {
  completed: "success",
  late:      "warning",
  missed:    "danger",
  upcoming:  "info",
};
const STATUS_LABEL: Record<ComplianceSlot["status"], string> = {
  completed: "On time",
  late:      "Late",
  missed:    "Missed",
  upcoming:  "Upcoming",
};

export default function CompliancePage() {
  const { data: summaries } = useLive<ComplianceSummary[]>(
    "/api/compliance",
    { select: (r) => (r as { items: ComplianceSummary[] }).items, intervalMs: 5_000 }
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const all = summaries ?? [];

  // Aggregate top-line numbers across all guards/routes shown
  const totals = all.reduce(
    (acc, s) => {
      acc.completed += s.completed;
      acc.late      += s.late;
      acc.missed    += s.missed;
      acc.upcoming  += s.upcoming;
      return acc;
    },
    { completed: 0, late: 0, missed: 0, upcoming: 0 }
  );
  const totalScored = totals.completed + totals.late + totals.missed;
  const overallPct  = totalScored === 0 ? 100 : Math.round((totals.completed / totalScored) * 100);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <>
      <Topbar title="Compliance" subtitle="Live patrol-route compliance for today" />

      <main className="px-4 sm:px-8 py-6 space-y-4">
        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric icon={<FiTarget className="h-4 w-4" />} label="Overall today"
            value={`${overallPct}%`}
            tone={overallPct >= 90 ? "success" : overallPct >= 70 ? "warning" : "danger"} />
          <Metric icon={<FiCheckCircle className="h-4 w-4" />} label="On time"
            value={`${totals.completed}`} tone="success" />
          <Metric icon={<FiClock className="h-4 w-4" />} label="Late"
            value={`${totals.late}`} tone="warning" />
          <Metric icon={<FiXCircle className="h-4 w-4" />} label="Missed"
            value={`${totals.missed}`} tone="danger" />
          <Metric icon={<FiClock className="h-4 w-4" />} label="Upcoming"
            value={`${totals.upcoming}`} tone="info" />
        </div>

        {/* Per-guard cards */}
        {all.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-sm text-[var(--color-muted)]">
              No compliance data yet.
              <br />
              Define routes in <span className="text-white">Patrol Routes</span>,
              assign guards, and the compliance table will populate in real time.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {all.map((s) => {
              const key = `${s.routeId}|${s.tagMac}`;
              const open = expanded.has(key);
              const tone = s.compliancePct >= 90 ? "text-[var(--color-success)]"
                         : s.compliancePct >= 70 ? "text-[var(--color-warning)]"
                                                  : "text-[var(--color-danger)]";
              return (
                <Card key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="w-full text-left p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {open ? <FiChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
                          : <FiChevronRight className="h-4 w-4 text-[var(--color-muted)]" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">
                        {s.guardName ?? s.tagName ?? s.tagMac}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {s.routeName} ·{" "}
                        <span className="text-[var(--color-success)]">{s.completed} on-time</span> ·{" "}
                        <span className="text-[var(--color-warning)]">{s.late} late</span> ·{" "}
                        <span className="text-[var(--color-danger)]">{s.missed} missed</span> ·{" "}
                        <span className="text-[var(--color-muted)]">{s.upcoming} upcoming</span>
                      </p>
                    </div>
                    <div className={cn("text-2xl font-bold mono", tone)}>{s.compliancePct}%</div>
                  </button>

                  {open && (
                    <CardContent className="border-t border-white/[0.04] pt-4 pb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] border-b border-white/[0.04]">
                            <th className="text-left font-medium py-2 pr-3">Expected</th>
                            <th className="text-left font-medium py-2 pr-3">Checkpoint</th>
                            <th className="text-left font-medium py-2 pr-3">Actual</th>
                            <th className="text-left font-medium py-2 pr-3">Delay</th>
                            <th className="text-right font-medium py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.slots.map((slot, idx) => (
                            <tr key={idx} className="border-t border-white/[0.02]">
                              <td className="py-2 pr-3 mono text-xs text-white">{slot.expectedTime}</td>
                              <td className="py-2 pr-3 text-white/90">{slot.location}</td>
                              <td className="py-2 pr-3 mono text-xs text-[var(--color-muted)]">
                                {slot.actualTime ?? "—"}
                              </td>
                              <td className="py-2 pr-3 mono text-xs">
                                {slot.delayMin !== undefined
                                  ? (slot.delayMin <= 0
                                      ? <span className="text-[var(--color-muted)]">{slot.delayMin === 0 ? "on time" : `${-slot.delayMin}m early`}</span>
                                      : <span className="text-[var(--color-warning)]">+{slot.delayMin}m</span>)
                                  : <span className="text-[var(--color-muted)]">—</span>}
                              </td>
                              <td className="py-2 text-right">
                                <Badge variant={STATUS_VARIANT[slot.status]}>{STATUS_LABEL[slot.status]}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function Metric({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "info";
}) {
  const color =
    tone === "success" ? "text-[var(--color-success)]" :
    tone === "warning" ? "text-[var(--color-warning)]" :
    tone === "danger"  ? "text-[var(--color-danger)]"  :
                         "text-[var(--color-primary)]";
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className={cn("flex items-center gap-2 text-[11px] uppercase tracking-[0.12em]", color)}>
          {icon}
          {label}
        </div>
        <p className={cn("mt-2 text-3xl font-bold mono", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}
