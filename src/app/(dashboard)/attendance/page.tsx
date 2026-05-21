"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/utils";
import {
  FiDownload, FiGrid, FiUser, FiCheck, FiX, FiCalendar, FiClock, FiMoon, FiSun,
} from "react-icons/fi";

type Shift = "day" | "night";

interface AttendanceCellRaw { date: string; shift: Shift; present: boolean; scans: number }
interface GuardRow {
  id: string;
  label: string;
  sublabel: string;
  totals: { presentDay: number; presentNight: number; absentDay: number; absentNight: number };
  cells: AttendanceCellRaw[];
}
interface AttendanceResp {
  ok: boolean;
  windowDays: number;
  dates: string[];
  guards: GuardRow[];
}

const VIEWS = [
  { id: "matrix",     label: "Matrix View",     icon: FiGrid },
  { id: "individual", label: "Individual View", icon: FiUser },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

export default function AttendancePage() {
  const { data: resp } = useLive<AttendanceResp>("/api/attendance",
    { select: (r) => r as AttendanceResp, intervalMs: 15_000 });

  const [view, setView] = useState<ViewId>("matrix");

  const dates  = resp?.dates  ?? [];
  const guards = resp?.guards ?? [];

  return (
    <>
      <Topbar
        title="Attendance"
        subtitle={`Rolling 30-day attendance · auto-refresh every 15s · ${guards.length} guard${guards.length === 1 ? "" : "s"}`}
      />

      <main className="px-4 sm:px-8 py-6 space-y-4">
        {/* Summary cards */}
        <SummaryStrip guards={guards} />

        {/* Controls */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-1 rounded-md border border-white/10 p-1 bg-white/[0.02]">
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    view === id
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-muted)] hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <a href="/api/attendance/csv?type=matrix" download>
                <Button variant="outline" size="sm">
                  <FiDownload className="h-3.5 w-3.5" /> Matrix CSV
                </Button>
              </a>
              <a href="/api/attendance/csv?type=individual" download>
                <Button variant="outline" size="sm">
                  <FiDownload className="h-3.5 w-3.5" /> Individual CSV
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {guards.length === 0 && (
          <Card className="p-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No BLE devices registered yet. Add some under{" "}
              <span className="text-white">Devices → BLE Devices</span> and they will appear here.
            </p>
          </Card>
        )}

        {/* Body */}
        {guards.length > 0 && view === "matrix"     && <MatrixView     dates={dates} guards={guards} />}
        {guards.length > 0 && view === "individual" && <IndividualView dates={dates} guards={guards} />}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary strip (totals across all guards)
// ---------------------------------------------------------------------------

function SummaryStrip({ guards }: { guards: GuardRow[] }) {
  const totals = useMemo(() => {
    let presentDay   = 0, presentNight = 0;
    let absentDay    = 0, absentNight  = 0;
    for (const g of guards) {
      presentDay   += g.totals.presentDay;
      presentNight += g.totals.presentNight;
      absentDay    += g.totals.absentDay;
      absentNight  += g.totals.absentNight;
    }
    const totalDay   = presentDay   + absentDay;
    const totalNight = presentNight + absentNight;
    return {
      presentDay, presentNight, absentDay, absentNight,
      rateDay:   totalDay   ? Math.round(100 * presentDay   / totalDay)   : 0,
      rateNight: totalNight ? Math.round(100 * presentNight / totalNight) : 0,
    };
  }, [guards]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <SummaryStat icon={FiSun}  label="Day shift presents"   value={totals.presentDay}   tone="success" />
      <SummaryStat icon={FiSun}  label="Day shift absents"    value={totals.absentDay}    tone="danger"  />
      <SummaryStat icon={FiMoon} label="Night shift presents" value={totals.presentNight} tone="success" />
      <SummaryStat icon={FiMoon} label="Night shift absents"  value={totals.absentNight}  tone="danger"  />
    </div>
  );
}

function SummaryStat({
  icon: Icon, label, value, tone,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "success" | "danger" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">{label}</p>
        <Icon className={cn(
          "h-4 w-4",
          tone === "success" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"
        )} />
      </div>
      <p className="text-3xl font-semibold text-white mt-2">{value}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Matrix view: dates down rows, guards across columns, day/night per cell
// ---------------------------------------------------------------------------

function MatrixView({ dates, guards }: { dates: string[]; guards: GuardRow[] }) {
  // Index cells for O(1) lookup
  const cellsByGuard = useMemo(() => {
    const m = new Map<string, Map<string, AttendanceCellRaw>>();
    for (const g of guards) {
      const inner = new Map<string, AttendanceCellRaw>();
      for (const c of g.cells) inner.set(`${c.date}|${c.shift}`, c);
      m.set(g.id, inner);
    }
    return m;
  }, [guards]);

  // newest first for display
  const reversedDates = [...dates].reverse();

  return (
    <Card>
      <CardHeader className="border-b border-white/[0.04]">
        <CardTitle>Attendance matrix</CardTitle>
        <p className="text-xs text-[var(--color-muted)]">
          Day shift: 06:00 – 18:00 · Night shift: 18:00 – 06:00 · Present = ≥ 1 Verified scan
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th rowSpan={2} className="text-left text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] font-medium py-2 px-4 sticky left-0 bg-[var(--color-bg)] z-10 border-b border-r border-white/[0.06]">
                Date
              </th>
              {guards.map((g) => (
                <th key={g.id} colSpan={2} className="border-b border-white/[0.06] border-l border-white/[0.04] px-3 py-2 text-center">
                  <p className="text-xs font-semibold text-white truncate" title={g.label}>{g.label}</p>
                  <p className="text-[10px] mono text-[var(--color-muted)] truncate" title={g.sublabel}>{g.sublabel}</p>
                </th>
              ))}
            </tr>
            <tr>
              {guards.map((g) => (
                <ShiftHeader key={g.id} />
              ))}
            </tr>
          </thead>
          <tbody>
            {reversedDates.map((date) => (
              <tr key={date} className="hover:bg-white/[0.02]">
                <td className="text-xs mono text-[var(--color-muted)] py-1.5 px-4 sticky left-0 bg-[var(--color-bg)] z-10 border-r border-white/[0.04] whitespace-nowrap">
                  {date}
                </td>
                {guards.map((g) => {
                  const cells = cellsByGuard.get(g.id)!;
                  const day   = cells.get(`${date}|day`);
                  const night = cells.get(`${date}|night`);
                  return (
                    <DayNightCells key={g.id} day={day} night={night} />
                  );
                })}
              </tr>
            ))}

            {/* Totals row */}
            <tr className="border-t-2 border-white/10 bg-white/[0.03]">
              <td className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] py-2 px-4 sticky left-0 bg-[var(--color-bg)] z-10 border-r border-white/[0.06] font-medium">
                Totals
              </td>
              {guards.map((g) => (
                <td key={g.id} colSpan={2} className="px-3 py-2 text-center border-l border-white/[0.04]">
                  <p className="text-[10px] text-[var(--color-success)]">
                    P: {g.totals.presentDay} / {g.totals.presentNight}
                  </p>
                  <p className="text-[10px] text-[var(--color-danger)]">
                    A: {g.totals.absentDay} / {g.totals.absentNight}
                  </p>
                  <p className="text-[9px] mono text-[var(--color-muted)] mt-1">
                    day / night
                  </p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ShiftHeader() {
  return (
    <>
      <th className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)] font-medium py-1 px-1 border-b border-l border-white/[0.06] text-center w-14">D</th>
      <th className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-muted)] font-medium py-1 px-1 border-b border-white/[0.06] text-center w-14">N</th>
    </>
  );
}

function DayNightCells({ day, night }: { day?: AttendanceCellRaw; night?: AttendanceCellRaw }) {
  return (
    <>
      <PresenceCell present={!!day?.present}   scans={day?.scans   ?? 0} borderLeft />
      <PresenceCell present={!!night?.present} scans={night?.scans ?? 0} />
    </>
  );
}

function PresenceCell({
  present, scans, borderLeft = false,
}: { present: boolean; scans: number; borderLeft?: boolean }) {
  return (
    <td
      className={cn(
        "px-2 py-1.5 text-center border-b border-white/[0.04]",
        borderLeft && "border-l border-white/[0.06]"
      )}
      title={`${scans} scan${scans === 1 ? "" : "s"}`}
    >
      {present ? (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-[var(--color-success)]/15 text-[var(--color-success)] ring-1 ring-[var(--color-success)]/30 mx-auto">
          <FiCheck className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      ) : (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded bg-[var(--color-danger)]/10 text-[var(--color-danger)] ring-1 ring-[var(--color-danger)]/20 mx-auto">
          <FiX className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Individual view: one section per guard, with totals
// ---------------------------------------------------------------------------

function IndividualView({ dates, guards }: { dates: string[]; guards: GuardRow[] }) {
  const reversedDates = [...dates].reverse();

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {guards.map((g) => {
        const cellsByKey = new Map<string, AttendanceCellRaw>();
        for (const c of g.cells) cellsByKey.set(`${c.date}|${c.shift}`, c);

        const totalDay   = g.totals.presentDay   + g.totals.absentDay;
        const totalNight = g.totals.presentNight + g.totals.absentNight;
        const rateDay    = totalDay   ? Math.round(100 * g.totals.presentDay   / totalDay)   : 0;
        const rateNight  = totalNight ? Math.round(100 * g.totals.presentNight / totalNight) : 0;

        return (
          <Card key={g.id} className="flex flex-col">
            <CardHeader className="border-b border-white/[0.04]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle>{g.label}</CardTitle>
                  <p className="text-[11px] mono text-[var(--color-muted)] truncate">{g.sublabel}</p>
                </div>
                <Badge variant={rateDay + rateNight >= 100 ? "success" : "warning"}>
                  {Math.round((rateDay + rateNight) / 2)}% overall
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <FiSun className="h-3 w-3 text-[var(--color-warning)]" />
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">Day shift</p>
                  </div>
                  <p className="text-lg font-semibold text-white">{g.totals.presentDay} <span className="text-xs text-[var(--color-muted)] font-normal">present</span></p>
                  <p className="text-[10px] text-[var(--color-danger)]">{g.totals.absentDay} absent</p>
                </div>
                <div className="rounded-md bg-white/[0.02] border border-white/[0.04] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <FiMoon className="h-3 w-3 text-[var(--color-primary)]" />
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">Night shift</p>
                  </div>
                  <p className="text-lg font-semibold text-white">{g.totals.presentNight} <span className="text-xs text-[var(--color-muted)] font-normal">present</span></p>
                  <p className="text-[10px] text-[var(--color-danger)]">{g.totals.absentNight} absent</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-surface)] backdrop-blur z-10">
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)] border-b border-white/[0.04]">
                    <th className="text-left font-medium py-2 px-4">Date</th>
                    <th className="text-center font-medium py-2 px-3">Day</th>
                    <th className="text-center font-medium py-2 px-3">Night</th>
                  </tr>
                </thead>
                <tbody>
                  {reversedDates.map((date) => {
                    const day   = cellsByKey.get(`${date}|day`);
                    const night = cellsByKey.get(`${date}|night`);
                    return (
                      <tr key={date} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-1.5 px-4 mono text-xs text-[var(--color-muted)] whitespace-nowrap">{date}</td>
                        <td className="py-1.5 px-3 text-center">
                          {day?.present
                            ? <Badge variant="success" className="!py-0">Present</Badge>
                            : <Badge variant="danger"  className="!py-0">Absent</Badge>}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          {night?.present
                            ? <Badge variant="success" className="!py-0">Present</Badge>
                            : <Badge variant="danger"  className="!py-0">Absent</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
