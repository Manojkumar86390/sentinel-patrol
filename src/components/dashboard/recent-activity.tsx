import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PatrolEvent } from "@/types";
import { FiArrowRight } from "react-icons/fi";

interface Props {
  events: PatrolEvent[];
}

const STATUS_VARIANT = {
  Verified: "success",
  Late:     "warning",
  Missed:   "danger",
} as const;

export function RecentActivity({ events }: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b border-white/[0.04]">
        <div>
          <CardTitle>Recent Patrol Activity</CardTitle>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Live feed from all ESP32 scanners
          </p>
        </div>
        <Link
          href="/logs"
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] inline-flex items-center gap-1 transition-colors"
        >
          View all <FiArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                <th className="text-left font-medium py-3 px-5">Guard / Tag</th>
                <th className="text-left font-medium py-3 px-5">Scanner</th>
                <th className="text-left font-medium py-3 px-5">Location</th>
                <th className="text-left font-medium py-3 px-5">Time</th>
                <th className="text-right font-medium py-3 px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-sm text-[var(--color-muted)]">
                    No events yet. Flash an ESP32 scanner to start streaming.
                  </td>
                </tr>
              )}
              {events.slice(0, 8).map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/5 grid place-items-center text-[10px] font-semibold text-white mono">
                        {(e.guardName ?? e.name).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="leading-tight">
                        <p className="text-white font-medium">
                          {e.guardName ?? e.name}
                          {e.guardName && (
                            <span className="text-[var(--color-muted)] text-xs ml-2 font-normal">
                              {e.name}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)] mono">{e.bluetoothMac}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-[var(--color-muted)] mono text-xs">{e.espId}</td>
                  <td className="py-3 px-5 text-white/90">{e.location}</td>
                  <td className="py-3 px-5 text-[var(--color-muted)] mono text-xs">
                    {e.date} {e.time}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
