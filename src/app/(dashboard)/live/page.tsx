"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, PulseDot } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { timeAgo, cn } from "@/lib/utils";
import { FiCpu, FiRadio, FiClock, FiActivity, FiMapPin } from "react-icons/fi";
import type { PatrolEvent, EspScanner, GuardPosition } from "@/types";

// Leaflet must be loaded client-only (uses window).
const LiveMap = dynamic(
  () => import("@/components/dashboard/live-map").then((m) => m.LiveMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] rounded-xl ring-1 ring-white/10 bg-[var(--color-surface)] grid place-items-center text-sm text-[var(--color-muted)]">
        Loading map…
      </div>
    ),
  }
);

export default function LivePage() {
  const { data: scanners } = useLive<EspScanner[]>("/api/esp32-scanners",
    { select: (r) => (r as { items: EspScanner[] }).items, intervalMs: 5000 });
  const { data: events }   = useLive<PatrolEvent[]>("/api/patrol-events?limit=100",
    { select: (r) => (r as { items: PatrolEvent[] }).items, intervalMs: 3000 });
  // Live-computed guard positions for the moving map markers. Poll fast (every
  // 2s) since this powers the smooth animation; CSS handles in-between motion.
  const { data: guardPositions } = useLive<GuardPosition[]>("/api/guard-positions",
    { select: (r) => (r as { items: GuardPosition[] }).items, intervalMs: 2000 });

  const ss = scanners ?? [];
  const es = events ?? [];
  const gp = guardPositions ?? [];
  const onlineCount = ss.filter((s) => s.status === "online").length;

  // re-render every 5s so timeAgo() refreshes
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Topbar title="Live Status" subtitle="Real-time ESP32 patrol stream · auto-refresh every 3s" />

      <main className="px-4 sm:px-8 py-6 space-y-6">
        {/* Live map of campus */}
        <Card className="overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <FiMapPin className="h-4 w-4 text-[var(--color-primary)]" />
                Campus map · IIITDM Kurnool
              </h2>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                {onlineCount > 0
                  ? `${onlineCount} of ${ss.length} scanner${ss.length === 1 ? "" : "s"} online`
                  : "Waiting for ESP32 heartbeats"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_6px_var(--color-success)]" />
                Online
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                Offline
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-500" />
                Unmapped
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]" />
                Guard (live)
              </span>
            </div>
          </div>

          <div className="p-4">
            <LiveMap scanners={ss} events={es} guardPositions={gp} height={460} />
            <p className="mt-3 text-[10px] text-[var(--color-muted)]">
              💡 Each marker links to a registered scanner by matching its <strong>location</strong> field.
              To map a scanner to a pin, register it under <span className="text-white">Devices → ESP32 Scanners</span> with
              a location name matching one of: <code className="mono text-[var(--color-primary)]">Main Gate</code>,{" "}
              <code className="mono text-[var(--color-primary)]">ECE Block</code>,{" "}
              <code className="mono text-[var(--color-primary)]">Sports</code>,{" "}
              <code className="mono text-[var(--color-primary)]">MVHR Hostel</code>.
            </p>
            <p className="mt-2 text-[10px] text-[var(--color-muted)]">
              🟡 <strong>Live guard tracking</strong> — yellow markers show guards detected by 1+ scanners in the last 30s.
              Position is computed from BLE signal strength (RSSI) using weighted interpolation between scanners.
              Click a guard marker to see the RSSI sample data used. Accuracy improves with more scanners deployed.
            </p>
          </div>
        </Card>

        <div>
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <FiRadio className="h-4 w-4 text-[var(--color-primary)]" />
            Checkpoint Scanners
          </h3>
          {ss.length === 0 ? (
            <Card className="p-8 text-center text-sm text-[var(--color-muted)]">
              No scanners registered. Add one in <span className="text-white">Devices → ESP32 Scanners</span>.
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ss.map((s) => {
                const online = s.status === "online";
                const lastAtLocation = es.find((e) => e.espId === s.esp_id);
                return (
                  <Card
                    key={s.id}
                    className={cn("p-5 relative overflow-hidden transition-all",
                      online ? "hover:border-[var(--color-primary)]/30" : "border-[var(--color-danger)]/20")}
                  >
                    <div aria-hidden className={cn(
                      "absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-25 blur-2xl",
                      online ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]")} />

                    <div className="relative flex items-center gap-3">
                      <div className={cn("grid h-10 w-10 place-items-center rounded-lg ring-1 shrink-0",
                        online
                          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] ring-[var(--color-primary)]/20"
                          : "bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-[var(--color-danger)]/20")}>
                        <FiCpu className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs mono text-[var(--color-muted)] truncate">{s.esp_id}</p>
                        <p className="text-sm font-semibold text-white truncate">{s.location}</p>
                      </div>
                      <PulseDot className={online ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"} />
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-2">
                      {s.description && (
                        <p className="text-[10px] text-[var(--color-muted)] truncate">{s.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <FiClock className="h-3 w-3 text-[var(--color-muted)]" />
                        <span className="text-[var(--color-muted)]">Heartbeat:</span>
                        <span className="ml-auto mono text-white">{timeAgo(s.last_heartbeat)}</span>
                      </div>
                      {lastAtLocation && (
                        <div className="text-xs">
                          <p className="text-[var(--color-muted)]">Last detection:</p>
                          <p className="text-white mt-1">{lastAtLocation.guardName ?? lastAtLocation.name}</p>
                          <p className="mono text-[10px] text-[var(--color-muted)]">
                            {lastAtLocation.date} {lastAtLocation.time}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {es.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FiActivity className="h-4 w-4 text-[var(--color-primary)]" />
              Latest events
            </h3>
            <Card>
              <CardContent className="p-0 divide-y divide-white/[0.04]">
                {es.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-4">
                    <Badge variant={e.status === "Verified" ? "success" : e.status === "Late" ? "warning" : "danger"}>
                      {e.status}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium truncate">{e.guardName ?? e.name}</p>
                      <p className="text-[10px] mono text-[var(--color-muted)] truncate">{e.bluetoothMac}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-white">{e.location}</p>
                      <p className="text-[10px] mono text-[var(--color-muted)]">{timeAgo(e.receivedAt)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
