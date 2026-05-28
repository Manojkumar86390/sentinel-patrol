"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, PulseDot } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { timeAgo, cn } from "@/lib/utils";
import {
  FiAlertTriangle, FiZap, FiActivity, FiUsers,
  FiCheck, FiMapPin, FiCpu, FiClock, FiTrash2,
  FiVolume2, FiVolumeX,
} from "react-icons/fi";
import type { AlertType, EmergencyAlert } from "@/types";

// Visual treatment per alert type.
const TYPE_STYLE: Record<AlertType, { color: string; bg: string; ring: string; icon: React.ComponentType<{ className?: string }>; label: string; }> = {
  accident: { color: "text-red-400",    bg: "bg-red-500/10",    ring: "ring-red-500/30",    icon: FiAlertTriangle, label: "Accident" },
  fire:     { color: "text-orange-400", bg: "bg-orange-500/10", ring: "ring-orange-500/30", icon: FiZap,           label: "Fire" },
  bleeding: { color: "text-rose-400",   bg: "bg-rose-500/10",   ring: "ring-rose-500/30",   icon: FiActivity,      label: "Bleeding" },
  fight:    { color: "text-amber-400",  bg: "bg-amber-500/10",  ring: "ring-amber-500/30",  icon: FiUsers,         label: "Fight" },
};

/**
 * Play a sharp three-pulse alarm using Web Audio API. No external sound file
 * required — synthesized in-browser, so it works offline and on Vercel without
 * shipping an audio asset. Returns silently if the browser blocks audio (e.g.
 * before any user interaction on the page).
 */
function playAlarmBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    // Three quick pulses at 880 Hz (high enough to feel urgent, not painful)
    for (let i = 0; i < 3; i++) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";              // square wave = sharper, alarm-like
      osc.frequency.value = 880;

      const start = ctx.currentTime + i * 0.18;
      const stop  = start + 0.10;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
      gain.gain.linearRampToValueAtTime(0,    stop);
      osc.start(start);
      osc.stop(stop + 0.02);
    }

    // Close the context shortly after the last pulse to free resources
    setTimeout(() => { ctx.close().catch(() => {}); }, 700);
  } catch {
    /* Audio not available — silently ignore */
  }
}

export default function AlertsPage() {
  const { data: alerts, refresh } = useLive<EmergencyAlert[]>("/api/emergency-alerts",
    { select: (r) => (r as { items: EmergencyAlert[] }).items, intervalMs: 3000 });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [muted,  setMuted]  = useState(false);
  // IDs of alerts that are still in the "just arrived" flash window (1.4s).
  const [justArrived, setJustArrived] = useState<Set<string>>(new Set());
  // IDs we've already seen — so the very first render doesn't beep for every
  // existing alert on the page.
  const seenIdsRef = useRef<Set<string> | null>(null);

  // Detect newly arrived UNACKNOWLEDGED alerts and trigger sound + flash.
  // This runs on every alerts list change.
  useEffect(() => {
    if (!alerts) return;
    const currentIds = new Set(alerts.map((a) => a.id));

    // First load — record what we already had, don't beep.
    if (seenIdsRef.current === null) {
      seenIdsRef.current = currentIds;
      return;
    }

    // Find IDs that are new AND not yet acknowledged.
    const newOnes = alerts.filter(
      (a) => !seenIdsRef.current!.has(a.id) && !a.acknowledged
    );

    if (newOnes.length > 0) {
      if (!muted) playAlarmBeep();
      setJustArrived((prev) => {
        const next = new Set(prev);
        newOnes.forEach((a) => next.add(a.id));
        return next;
      });
      // Clear the flash after the CSS animation finishes (1.4s × 3 = 4.2s).
      setTimeout(() => {
        setJustArrived((prev) => {
          const next = new Set(prev);
          newOnes.forEach((a) => next.delete(a.id));
          return next;
        });
      }, 4500);
    }

    seenIdsRef.current = currentIds;
  }, [alerts, muted]);

  const all = alerts ?? [];
  const active   = useMemo(() => all.filter((a) =>  !a.acknowledged), [all]);
  const handled  = useMemo(() => all.filter((a) =>   a.acknowledged), [all]);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/emergency-alerts/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "acknowledge" }),
      });
      await refresh();
    } finally { setBusyId(null); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this alert from history?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/emergency-alerts/${id}`, { method: "DELETE" });
      await refresh();
    } finally { setBusyId(null); }
  }

  return (
    <>
      <Topbar
        title="Emergency Alerts"
        subtitle={`${active.length} active · ${handled.length} acknowledged · auto-refresh every 3s`}
      />

      <main className="px-4 sm:px-8 py-6 space-y-6">
        {/* Active section — pulsing if anything unacknowledged */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PulseDot className={active.length > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"} />
              <h2 className="text-sm font-semibold text-white">
                Active alerts {active.length > 0 && <span className="text-[var(--color-danger)]">({active.length})</span>}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Sound mute toggle. State only — defaults to unmuted so the first
                  demo alarm is heard. Clicking flips it. */}
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors",
                  muted
                    ? "border-white/10 text-[var(--color-muted)] hover:text-white hover:bg-white/[0.04]"
                    : "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                )}
                title={muted ? "Sound is OFF — click to enable" : "Sound is ON — click to mute"}
              >
                {muted ? <FiVolumeX className="h-3.5 w-3.5" /> : <FiVolume2 className="h-3.5 w-3.5" />}
                {muted ? "Sound off" : "Sound on"}
              </button>
              {active.length === 0 && handled.length > 0 && (
                <Badge variant="success">All clear</Badge>
              )}
            </div>
          </div>

          {active.length === 0 ? (
            <Card className="p-10 text-center">
              <FiCheck className="h-10 w-10 mx-auto text-[var(--color-success)]" />
              <p className="mt-3 text-sm text-white font-medium">All clear</p>
              <p className="text-xs text-[var(--color-muted)] mt-1">
                No active emergency alerts. The dashboard will jump to life if any button is pressed.
              </p>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {active.map((a) => (
                <ActiveAlertCard
                  key={a.id}
                  alert={a}
                  busy={busyId === a.id}
                  isNew={justArrived.has(a.id)}
                  onAck={() => acknowledge(a.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* History section */}
        {handled.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-white">History</h2>
              <span className="text-xs text-[var(--color-muted)]">({handled.length})</span>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-white/[0.04]">
                {handled.map((a) => (
                  <HistoryRow
                    key={a.id}
                    alert={a}
                    busy={busyId === a.id}
                    onRemove={() => remove(a.id)}
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Active alert card — big, attention-grabbing, with Acknowledge button.
// ---------------------------------------------------------------------------
function ActiveAlertCard({
  alert, busy, isNew, onAck,
}: { alert: EmergencyAlert; busy: boolean; isNew?: boolean; onAck: () => void }) {
  const style = TYPE_STYLE[alert.type];
  const Icon  = style.icon;

  return (
    <Card className={cn("relative overflow-hidden ring-1", style.ring, isNew && "alert-just-arrived")}>
      {/* Glow */}
      <div
        aria-hidden
        className={cn("absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-40", style.bg)}
      />

      <div className="relative p-5">
        <div className="flex items-start gap-4">
          <div className={cn("grid h-14 w-14 place-items-center rounded-xl ring-1", style.bg, style.ring)}>
            <Icon className={cn("h-7 w-7", style.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn("text-xl font-bold uppercase tracking-wide", style.color)}>
                {style.label}
              </h3>
              <Badge variant="danger" className="animate-pulse">UNACKNOWLEDGED</Badge>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <FiMapPin className="h-3.5 w-3.5 text-[var(--color-muted)] shrink-0" />
                <span className="text-white font-medium">{alert.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <FiCpu className="h-3 w-3 text-[var(--color-muted)] shrink-0" />
                <span className="mono text-[var(--color-muted)]">{alert.espId}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <FiClock className="h-3 w-3 text-[var(--color-muted)] shrink-0" />
                <span className="mono text-[var(--color-muted)]">
                  {alert.date} {alert.time} · {timeAgo(alert.triggeredAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div className="text-[10px]">
            {alert.notified ? (
              <Badge variant="success" className="cursor-help"
                     title={alert.notifyRecipients?.map((r) => `${r.kind}:${r.chatId} ${r.ok ? "✓" : "✗"}`).join("\n")}>
                Telegram sent ✓ ({alert.notifyRecipients?.filter((r) => r.ok).length ?? 0}/{alert.notifyRecipients?.length ?? 0})
              </Badge>
            ) : alert.notifyError ? (
              <span className="text-[var(--color-danger)] cursor-help" title={alert.notifyError}>
                Telegram failed
              </span>
            ) : (
              <span className="text-[var(--color-muted)]">Telegram skipped (no bot configured)</span>
            )}
          </div>

          <Button onClick={onAck} disabled={busy} className="!bg-[var(--color-success)] !text-white">
            <FiCheck className="h-4 w-4" />
            {busy ? "Acknowledging…" : "Acknowledge"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Handled / history row — compact.
// ---------------------------------------------------------------------------
function HistoryRow({
  alert, busy, onRemove,
}: { alert: EmergencyAlert; busy: boolean; onRemove: () => void }) {
  const style = TYPE_STYLE[alert.type];
  const Icon  = style.icon;
  return (
    <div className="flex items-start gap-3 p-4">
      <div className={cn("grid h-9 w-9 place-items-center rounded-lg ring-1 shrink-0", style.bg, style.ring)}>
        <Icon className={cn("h-4 w-4", style.color)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-semibold", style.color)}>{style.label}</p>
          <Badge variant="muted">acknowledged</Badge>
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          <span className="text-white">{alert.location}</span>
          {" · "}<span className="mono">{alert.espId}</span>
          {" · "}<span className="mono">{alert.date} {alert.time}</span>
        </p>
        {alert.acknowledgedAt && (
          <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
            Ack'd by {alert.acknowledgedBy ?? "—"} {timeAgo(alert.acknowledgedAt)}
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={busy}
        aria-label="Remove"
        className="grid h-7 w-7 place-items-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors shrink-0"
      >
        <FiTrash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
