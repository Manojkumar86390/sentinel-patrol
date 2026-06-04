"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { cn } from "@/lib/utils";
import { FiPlus, FiTrash2, FiX, FiMap, FiClock, FiRepeat } from "react-icons/fi";
import type {
  BleDevice,
  EspScanner,
  PatrolRoute,
  RouteAssignment,
  LoopingRouteConfig,
  FixedRouteConfig,
} from "@/types";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function RoutesPage() {
  const { data: routesPayload, refresh } = useLive<
    { items: PatrolRoute[]; assignments: RouteAssignment[] }
  >("/api/routes", {
    select: (r) => r as { items: PatrolRoute[]; assignments: RouteAssignment[] },
    intervalMs: 10_000,
  });
  const { data: scanners } = useLive<EspScanner[]>("/api/esp32-scanners", {
    select: (r) => (r as { items: EspScanner[] }).items, intervalMs: 30_000,
  });
  const { data: bleDevices } = useLive<BleDevice[]>("/api/ble-devices", {
    select: (r) => (r as { items: BleDevice[] }).items, intervalMs: 30_000,
  });

  const routes      = routesPayload?.items ?? [];
  const assignments = routesPayload?.assignments ?? [];

  const [editing, setEditing] = useState<PatrolRoute | null>(null);
  const [showNew, setShowNew] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this route? This will also remove all guard assignments to it.")) return;
    await fetch(`/api/routes/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <>
      <Topbar title="Patrol Routes" subtitle="Scheduled checkpoint sequences for security guards" />

      <main className="px-4 sm:px-8 py-6 space-y-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Registered routes</h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  {routes.length === 0
                    ? "No routes yet — create the first one to start tracking compliance."
                    : `${routes.length} route${routes.length === 1 ? "" : "s"} configured`}
                </p>
              </div>
              <Button onClick={() => { setEditing(null); setShowNew(true); }}>
                <FiPlus className="h-4 w-4" /> New Route
              </Button>
            </div>

            {/* Existing routes list */}
            {routes.length > 0 && !showNew && !editing && (
              <div className="space-y-3">
                {routes.map((r) => {
                  const myAssignments = assignments.filter((a) => a.route_id === r.id);
                  return (
                    <div key={r.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-white">{r.name}</h3>
                            <Badge variant={r.active ? "success" : "danger"}>
                              {r.active ? "active" : "paused"}
                            </Badge>
                            <Badge variant="info">
                              {r.route_type === "looping" ? <><FiRepeat className="h-3 w-3" /> looping</>
                                                          : <><FiClock  className="h-3 w-3" /> fixed</>}
                            </Badge>
                          </div>
                          {r.description && (
                            <p className="text-xs text-[var(--color-muted)] mt-1">{r.description}</p>
                          )}
                          <p className="text-xs text-[var(--color-muted)] mt-2">
                            <strong className="text-white">Tolerance:</strong> {r.late_tolerance_min} min ·{" "}
                            {r.shift_start && r.shift_end
                              ? <><strong className="text-white">Shift:</strong> {r.shift_start} – {r.shift_end}</>
                              : <strong className="text-white">24/7</strong>}
                          </p>
                          <RouteSummary route={r} scanners={scanners ?? []} />
                          {myAssignments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {myAssignments.map((a) => {
                                const ble = (bleDevices ?? []).find(
                                  (d) => d.mac_address.toUpperCase() === a.ble_mac.toUpperCase()
                                );
                                return (
                                  <span key={a.id} className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-400/30">
                                    {ble?.guard_name ?? ble?.ble_name ?? a.ble_mac}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button onClick={() => { setEditing(r); setShowNew(false); }}>Edit</Button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            aria-label="Delete"
                            className="grid h-9 w-9 place-items-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create / edit form */}
            {(showNew || editing) && (
              <RouteForm
                initial={editing}
                scanners={scanners ?? []}
                bleDevices={bleDevices ?? []}
                currentAssignments={assignments.filter((a) => a.route_id === editing?.id)}
                onCancel={() => { setShowNew(false); setEditing(null); }}
                onSaved={async () => { setShowNew(false); setEditing(null); await refresh(); }}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

// ─── Route summary string (used in the list) ─────────────────────────────────
function RouteSummary({ route, scanners }: { route: PatrolRoute; scanners: EspScanner[] }) {
  if (route.route_type === "looping") {
    const c = route.config as LoopingRouteConfig;
    const stops = c.checkpoints
      .map((id) => scanners.find((s) => s.esp_id === id)?.location ?? id)
      .join(" → ");
    return (
      <p className="text-xs text-[var(--color-muted)] mt-1">
        Every <strong className="text-white">{c.intervalMin} min</strong>: {stops}
      </p>
    );
  }
  const c = route.config as FixedRouteConfig;
  return (
    <p className="text-xs text-[var(--color-muted)] mt-1">
      {c.schedule.length} scheduled checkpoint{c.schedule.length === 1 ? "" : "s"}:{" "}
      {c.schedule.slice(0, 3).map((s) => `${s.time} ${scanners.find((x) => x.esp_id === s.espId)?.location ?? s.espId}`).join(" · ")}
      {c.schedule.length > 3 && ` … +${c.schedule.length - 3} more`}
    </p>
  );
}

// ─── Create/edit form ────────────────────────────────────────────────────────
function RouteForm({
  initial, scanners, bleDevices, currentAssignments, onCancel, onSaved,
}: {
  initial: PatrolRoute | null;
  scanners: EspScanner[];
  bleDevices: BleDevice[];
  currentAssignments: RouteAssignment[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [type, setType] = useState<"looping" | "fixed">(initial?.route_type ?? "looping");

  // Looping state
  const initialLoop = (initial?.config && (initial.config as LoopingRouteConfig).checkpoints)
    ? initial.config as LoopingRouteConfig
    : { intervalMin: 30, checkpoints: [] as string[] };
  const [intervalMin,  setIntervalMin]  = useState(initialLoop.intervalMin);
  const [loopCheckpoints, setLoopCheckpoints] = useState<string[]>(initialLoop.checkpoints);

  // Fixed state
  const initialFixed = (initial?.config && (initial.config as FixedRouteConfig).schedule)
    ? initial.config as FixedRouteConfig
    : { schedule: [] as Array<{ time: string; espId: string }> };
  const [schedule, setSchedule] = useState(initialFixed.schedule);

  // Shared fields
  const [name,         setName]         = useState(initial?.name ?? "");
  const [description,  setDescription]  = useState(initial?.description ?? "");
  const [tolerance,    setTolerance]    = useState(initial?.late_tolerance_min ?? 15);
  const [shiftStart,   setShiftStart]   = useState(initial?.shift_start ?? "");
  const [shiftEnd,     setShiftEnd]     = useState(initial?.shift_end ?? "");
  const [active,       setActive]       = useState(initial?.active ?? true);

  // Guard assignments — initially from currentAssignments, otherwise empty
  const [assignedMacs, setAssignedMacs] = useState<Set<string>>(
    new Set(currentAssignments.map((a) => a.ble_mac.toUpperCase()))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const config = type === "looping"
      ? { intervalMin, checkpoints: loopCheckpoints }
      : { schedule };

    const payload = {
      name, description, route_type: type,
      late_tolerance_min: tolerance,
      shift_start: shiftStart || undefined,
      shift_end:   shiftEnd   || undefined,
      config,
      active,
      assignments: [...assignedMacs].map((mac) => ({ ble_mac: mac })),
    };

    const url = initial ? `/api/routes/${initial.id}` : "/api/routes";
    const method = initial ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { setError(json.error ?? "Save failed"); return; }
      await onSaved();
    } finally {
      setBusy(false);
    }
  }

  function addCheckpoint(espId: string) {
    if (!espId) return;
    setLoopCheckpoints((prev) => [...prev, espId]);
  }
  function removeCheckpoint(idx: number) {
    setLoopCheckpoints((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveCheckpoint(idx: number, dir: -1 | 1) {
    setLoopCheckpoints((prev) => {
      const a = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= a.length) return prev;
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });
  }

  function addScheduleRow() {
    setSchedule((prev) => [...prev, { time: "22:00", espId: scanners[0]?.esp_id ?? "" }]);
  }
  function updateScheduleRow(idx: number, patch: Partial<{ time: string; espId: string }>) {
    setSchedule((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function removeScheduleRow(idx: number) {
    setSchedule((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleAssignment(mac: string) {
    const upper = mac.toUpperCase();
    setAssignedMacs((prev) => {
      const next = new Set(prev);
      if (next.has(upper)) next.delete(upper); else next.add(upper);
      return next;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">
          {initial ? `Edit "${initial.name}"` : "New patrol route"}
        </h3>
        <button type="button" onClick={onCancel} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-[var(--color-muted)] hover:text-white hover:bg-white/[0.06]">
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {/* Basics */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Route Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Night patrol — north side" />
        </Field>
        <Field label="Description (optional)">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hourly patrol of the north quadrant" />
        </Field>
      </div>

      {/* Type toggle */}
      <div>
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em] block mb-2">Route Type</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setType("looping")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm border transition-colors",
              type === "looping"
                ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                : "border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]")}>
            <FiRepeat className="h-4 w-4" /> Looping
          </button>
          <button type="button" onClick={() => setType("fixed")}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm border transition-colors",
              type === "fixed"
                ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                : "border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]")}>
            <FiClock className="h-4 w-4" /> Fixed schedule
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-muted)] mt-2">
          {type === "looping"
            ? "Guard walks the listed checkpoints in order, repeating every N minutes."
            : "Each checkpoint has its own specific time of day."}
        </p>
      </div>

      {/* Type-specific config */}
      {type === "looping" ? (
        <div className="space-y-3">
          <Field label="Interval (minutes between full loops)">
            <Input type="number" min={1} value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value) || 1)} className="max-w-[160px]" />
          </Field>
          <Field label="Checkpoints in order">
            <div className="space-y-2">
              {loopCheckpoints.length === 0 && (
                <p className="text-xs text-[var(--color-muted)]">No checkpoints yet. Add the first one below.</p>
              )}
              {loopCheckpoints.map((espId, idx) => {
                const sc = scanners.find((s) => s.esp_id === espId);
                return (
                  <div key={`${espId}-${idx}`} className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                    <span className="text-xs text-[var(--color-muted)] w-6 text-center">{idx + 1}</span>
                    <div className="flex-1 text-sm">
                      <span className="text-white">{sc?.location ?? espId}</span>
                      <span className="mono text-[10px] text-[var(--color-muted)] ml-2">{espId}</span>
                    </div>
                    <button type="button" onClick={() => moveCheckpoint(idx, -1)} className="text-xs text-[var(--color-muted)] hover:text-white px-2">↑</button>
                    <button type="button" onClick={() => moveCheckpoint(idx,  1)} className="text-xs text-[var(--color-muted)] hover:text-white px-2">↓</button>
                    <button type="button" onClick={() => removeCheckpoint(idx)} className="text-xs text-[var(--color-danger)] hover:text-red-400 px-2">remove</button>
                  </div>
                );
              })}
              <select
                onChange={(e) => { addCheckpoint(e.target.value); e.target.value = ""; }}
                defaultValue=""
                className="w-full rounded-md bg-white/[0.02] border border-white/10 px-3 py-2 text-sm text-white"
              >
                <option value="" disabled>+ Add a checkpoint…</option>
                {scanners.map((s) => (
                  <option key={s.esp_id} value={s.esp_id}>
                    {s.location} · {s.esp_id}
                  </option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Scheduled checkpoints">
            <div className="space-y-2">
              {schedule.length === 0 && (
                <p className="text-xs text-[var(--color-muted)]">No checkpoints yet. Add the first one below.</p>
              )}
              {schedule.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2">
                  <input
                    type="time"
                    value={row.time}
                    onChange={(e) => updateScheduleRow(idx, { time: e.target.value })}
                    className="rounded bg-white/[0.04] border border-white/10 px-2 py-1 text-sm text-white mono"
                  />
                  <select
                    value={row.espId}
                    onChange={(e) => updateScheduleRow(idx, { espId: e.target.value })}
                    className="flex-1 rounded bg-white/[0.04] border border-white/10 px-2 py-1 text-sm text-white"
                  >
                    {scanners.map((s) => (
                      <option key={s.esp_id} value={s.esp_id}>{s.location} · {s.esp_id}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeScheduleRow(idx)} className="text-xs text-[var(--color-danger)] hover:text-red-400 px-2">remove</button>
                </div>
              ))}
              <button type="button" onClick={addScheduleRow} className="text-xs text-[var(--color-primary)] hover:underline">
                + Add scheduled checkpoint
              </button>
            </div>
          </Field>
        </div>
      )}

      {/* Late tolerance + shift window */}
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Late tolerance (min)">
          <Input type="number" min={1} value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value) || 15)} />
        </Field>
        <Field label="Shift start (optional)">
          <Input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} />
        </Field>
        <Field label="Shift end (optional)">
          <Input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} />
        </Field>
      </div>
      <p className="text-[11px] text-[var(--color-muted)] -mt-2">
        Leave shift start &amp; end blank for a 24/7 route. If end is earlier than start
        (e.g. 22:00 → 06:00) the system treats it as a night shift wrapping past midnight.
      </p>

      {/* Guard assignments */}
      <div>
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em] block mb-2">
          Assign Guards (BLE devices)
        </label>
        <div className="flex flex-wrap gap-2">
          {bleDevices.length === 0 && (
            <p className="text-xs text-[var(--color-muted)]">No BLE devices registered yet. Register one in Devices → BLE Devices first.</p>
          )}
          {bleDevices.map((d) => {
            const sel = assignedMacs.has(d.mac_address.toUpperCase());
            const label = d.guard_name ?? d.ble_name;
            return (
              <button
                type="button"
                key={d.mac_address}
                onClick={() => toggleAssignment(d.mac_address)}
                className={cn("text-xs px-3 py-1.5 rounded-md border transition-colors",
                  sel
                    ? "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)]"
                    : "border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]")}
              >
                {sel ? "✓ " : ""}{label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active toggle */}
      <label className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        Active (uncheck to pause this route)
      </label>

      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.04]">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : (initial ? "Update route" : "Create route")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em]">{label}</label>
      {children}
    </div>
  );
}
