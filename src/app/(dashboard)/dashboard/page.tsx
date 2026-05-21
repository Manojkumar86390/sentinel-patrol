"use client";

import { Topbar } from "@/components/layout/topbar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ScannerStrip } from "@/components/dashboard/scanner-strip";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { AnalyticsChart } from "@/components/dashboard/analytics-chart";
import { useLive } from "@/hooks/use-live";
import { FiTag, FiActivity, FiCpu, FiAlertTriangle } from "react-icons/fi";
import type { PatrolEvent, EspScanner, DashboardStats } from "@/types";

export default function DashboardPage() {
  const { data: stats }    = useLive<DashboardStats>("/api/dashboard-stats",
    { select: (r) => (r as { stats: DashboardStats }).stats });
  const { data: events }   = useLive<PatrolEvent[]>("/api/patrol-events?limit=15",
    { select: (r) => (r as { items: PatrolEvent[] }).items });
  const { data: scanners } = useLive<EspScanner[]>("/api/esp32-scanners",
    { select: (r) => (r as { items: EspScanner[] }).items });

  const s = stats ?? {
    total_ble_devices: 0, total_scanners: 0, online_scanners: 0,
    active_today: 0, missed_checkpoints_today: 0, verified_today: 0,
    active_alerts: 0,
  };

  return (
    <>
      <Topbar title="Dashboard" subtitle="Live ESP32 patrol stream · auto-refresh every 5s" />

      <main className="px-4 sm:px-8 py-6 space-y-6">
        {s.active_alerts > 0 && (
          <a href="/alerts" className="block">
            <div className="rounded-lg ring-1 ring-[var(--color-danger)]/40 bg-[var(--color-danger)]/[0.08] p-4 flex items-center gap-3 hover:bg-[var(--color-danger)]/[0.12] transition-colors animate-pulse">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--color-danger)]/20 text-[var(--color-danger)]">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-danger)]">
                  {s.active_alerts} active emergency alert{s.active_alerts === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Click to view and acknowledge in Emergency Alerts.
                </p>
              </div>
            </div>
          </a>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard label="BLE Tags"        value={s.total_ble_devices} icon={FiTag} />
          <StatsCard label="Active Today"    value={s.active_today}      icon={FiActivity} tone="success" />
          <StatsCard label="Online Scanners" value={`${s.online_scanners}/${s.total_scanners}`}
                     icon={FiCpu}
                     tone={s.online_scanners === s.total_scanners && s.total_scanners > 0 ? "success" : "default"} />
          <StatsCard label="Missed Today"    value={s.missed_checkpoints_today}
                     icon={FiAlertTriangle}
                     tone={s.missed_checkpoints_today > 0 ? "warning" : "success"} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><AnalyticsChart /></div>
          <AlertsPanel scanners={scanners ?? []} events={events ?? []} />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><RecentActivity events={events ?? []} /></div>
          <ScannerStrip scanners={scanners ?? []} />
        </div>
      </main>
    </>
  );
}
