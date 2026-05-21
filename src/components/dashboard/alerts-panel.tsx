import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { FiAlertTriangle, FiWifiOff } from "react-icons/fi";
import type { EspScanner, PatrolEvent } from "@/types";

interface Props {
  scanners: EspScanner[];
  events: PatrolEvent[];
}

export function AlertsPanel({ scanners, events }: Props) {
  const offline = scanners.filter((s) => s.status === "offline");
  const missed  = events.filter((e) => e.status === "Missed").slice(0, 4);

  const alerts = [
    ...offline.map((s) => ({
      id: `off-${s.id}`,
      icon: FiWifiOff,
      title: `${s.esp_id} offline`,
      detail: s.location,
      time: timeAgo(s.last_heartbeat),
      severity: "danger" as const,
    })),
    ...missed.map((e) => ({
      id: `miss-${e.id}`,
      icon: FiAlertTriangle,
      title: `Missed scan at ${e.location}`,
      detail: e.espId,
      time: timeAgo(e.receivedAt),
      severity: "warning" as const,
    })),
  ];

  return (
    <Card>
      <CardHeader className="border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <CardTitle>Alerts</CardTitle>
          <Badge variant={alerts.length > 0 ? "danger" : "success"}>{alerts.length}</Badge>
        </div>
        <p className="text-xs text-[var(--color-muted)]">Requires attention</p>
      </CardHeader>

      <CardContent className="divide-y divide-white/[0.04] p-0">
        {alerts.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--color-muted)]">
            All clear — no active alerts.
          </div>
        )}
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-3 p-4">
            <div
              className={
                a.severity === "danger"
                  ? "grid h-8 w-8 place-items-center rounded-md bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/30 shrink-0"
                  : "grid h-8 w-8 place-items-center rounded-md bg-[var(--color-warning)]/10 text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/30 shrink-0"
              }
            >
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white font-medium truncate">{a.title}</p>
              <p className="text-xs text-[var(--color-muted)] truncate">{a.detail}</p>
            </div>
            <p className="text-[10px] mono text-[var(--color-muted)] shrink-0">{a.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
