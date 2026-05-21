"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import type { PatrolEvent, EventStatus } from "@/types";
import { FiSearch, FiDownload, FiFilter, FiRefreshCw } from "react-icons/fi";

const STATUS_FILTERS: Array<EventStatus | "all"> = ["all", "Verified", "Late", "Missed"];

const STATUS_VARIANT = {
  Verified: "success",
  Late:     "warning",
  Missed:   "danger",
} as const;

export default function LogsPage() {
  const { data: events, refresh } = useLive<PatrolEvent[]>("/api/patrol-events?limit=1000",
    { select: (r) => (r as { items: PatrolEvent[] }).items, intervalMs: 5000 });

  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState<EventStatus | "all">("all");
  const [page,   setPage]   = useState(1);
  const PAGE_SIZE = 10;

  const all = events ?? [];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return all.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.guardName ?? "").toLowerCase().includes(q) ||
        e.bluetoothMac.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.espId.toLowerCase().includes(q)
      );
    });
  }, [all, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Topbar title="Patrol Logs" subtitle={`${filtered.length} records · auto-refresh every 5s`} />

      <main className="px-4 sm:px-8 py-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
                <Input
                  placeholder="Search by guard, MAC, scanner ID, location…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <FiFilter className="h-4 w-4 text-[var(--color-muted)] shrink-0" />
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setPage(1); }}
                    className={
                      "shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors " +
                      (status === s
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]")
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={refresh}>
                  <FiRefreshCw className="h-3.5 w-3.5" /> Refresh
                </Button>
                <a href="/api/patrol-events/csv?period=daily" download>
                  <Button variant="outline" size="sm">
                    <FiDownload className="h-3.5 w-3.5" /> CSV (today)
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] border-b border-white/[0.04]">
                    <th className="text-left font-medium py-3 px-5">Guard / Tag</th>
                    <th className="text-left font-medium py-3 px-5">Bluetooth MAC</th>
                    <th className="text-left font-medium py-3 px-5">Scanner</th>
                    <th className="text-left font-medium py-3 px-5">Location</th>
                    <th className="text-left font-medium py-3 px-5">Date</th>
                    <th className="text-left font-medium py-3 px-5">Time</th>
                    <th className="text-right font-medium py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-[var(--color-muted)]">
                        No logs match your filters.
                      </td>
                    </tr>
                  )}
                  {rows.map((e) => (
                    <tr key={e.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-5">
                        <p className="text-white font-medium">{e.guardName ?? e.name}</p>
                        {e.guardName && (
                          <p className="text-[10px] text-[var(--color-muted)]">{e.name}</p>
                        )}
                      </td>
                      <td className="py-3 px-5 mono text-xs text-[var(--color-muted)]">{e.bluetoothMac}</td>
                      <td className="py-3 px-5 mono text-xs text-[var(--color-muted)]">{e.espId}</td>
                      <td className="py-3 px-5 text-white/90">{e.location}</td>
                      <td className="py-3 px-5 mono text-xs text-[var(--color-muted)]">{e.date}</td>
                      <td className="py-3 px-5 mono text-xs text-[var(--color-muted)]">{e.time}</td>
                      <td className="py-3 px-5 text-right">
                        <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-white/[0.04]">
              <p className="text-xs text-[var(--color-muted)]">
                Showing <span className="text-white">{filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}</span>–
                <span className="text-white">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of{" "}
                <span className="text-white">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <span className="text-xs mono text-[var(--color-muted)] px-2">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages}
                        onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
