"use client";

import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { FiDownload, FiFileText, FiCalendar, FiActivity } from "react-icons/fi";
import type { DashboardStats, PatrolEvent } from "@/types";

const REPORT_TYPES = [
  { id: "daily",  title: "Daily Report",  desc: "Today's patrol activity",  icon: FiCalendar, url: "/api/patrol-events/csv?period=daily" },
  { id: "weekly", title: "Weekly Report", desc: "Last 7 days of activity",  icon: FiFileText, url: "/api/patrol-events/csv?period=weekly" },
  { id: "all",    title: "Full Export",   desc: "Every recorded event",     icon: FiActivity, url: "/api/patrol-events/csv?period=all" },
] as const;

export default function ReportsPage() {
  const { data: stats }  = useLive<DashboardStats>("/api/dashboard-stats",
    { select: (r) => (r as { stats: DashboardStats }).stats, intervalMs: 10_000 });
  const { data: events } = useLive<PatrolEvent[]>("/api/patrol-events?limit=1000",
    { select: (r) => (r as { items: PatrolEvent[] }).items, intervalMs: 10_000 });

  const s  = stats ?? {
    total_ble_devices: 0, total_scanners: 0, online_scanners: 0,
    active_today: 0, missed_checkpoints_today: 0, verified_today: 0,
  };
  const es = events ?? [];
  const total    = es.length;
  const missed   = es.filter((e) => e.status === "Missed").length;
  const late     = es.filter((e) => e.status === "Late").length;
  const verified = es.filter((e) => e.status === "Verified").length;

  return (
    <>
      <Topbar title="Reports" subtitle="Export patrol activity to Excel/CSV" />

      <main className="px-4 sm:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryStat label="Total Scans"  value={total} />
          <SummaryStat label="Verified"     value={verified} tone="success" />
          <SummaryStat label="Late"         value={late}     tone="warning" />
          <SummaryStat label="Missed"       value={missed}   tone="danger" />
        </div>

        <Card>
          <CardHeader className="border-b border-white/[0.04]">
            <CardTitle>Today at a glance</CardTitle>
            <p className="text-xs text-[var(--color-muted)]">Quick numbers from /api/dashboard-stats</p>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KV label="Active today"     value={s.active_today} />
              <KV label="Verified today"   value={s.verified_today} />
              <KV label="Missed today"     value={s.missed_checkpoints_today} />
              <KV label="Online scanners"  value={`${s.online_scanners} / ${s.total_scanners}`} />
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Downloads</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map(({ id, title, desc, icon: Icon, url }) => (
              <Card key={id} className="p-5 hover:border-[var(--color-primary)]/30 transition-colors group">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 text-sm font-semibold text-white">{title}</h4>
                <p className="mt-1 text-xs text-[var(--color-muted)] leading-relaxed">{desc}</p>
                <a href={url} download>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    <FiDownload className="h-3.5 w-3.5" /> Download CSV
                  </Button>
                </a>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

function SummaryStat({ label, value, tone = "default" }: {
  label: string; value: number; tone?: "default" | "success" | "warning" | "danger";
}) {
  const variant = tone === "default" ? "info" : tone;
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-3xl font-semibold text-white">{value}</span>
        <Badge variant={variant as "info" | "success" | "warning" | "danger"} className="mb-1">
          {tone === "default" ? "total" : tone}
        </Badge>
      </div>
    </Card>
  );
}

function KV({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
      <p className="text-2xl font-semibold text-white mt-1">{value}</p>
    </div>
  );
}
