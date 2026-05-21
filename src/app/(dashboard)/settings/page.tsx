"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AppConfig } from "@/types";

export default function SettingsPage() {
  const [cfg,     setCfg]     = useState<AppConfig | null>(null);
  const [busy,    setBusy]    = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((j) => {
      if (j.ok) setCfg(j.config);
    });
  }, []);

  async function handleSave() {
    if (!cfg) return;
    setBusy(true);
    try {
      const res = await fetch("/api/config", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(cfg),
      });
      const json = await res.json();
      if (json.ok) {
        setCfg(json.config);
        setSavedAt(new Date().toLocaleTimeString());
      }
    } finally { setBusy(false); }
  }

  return (
    <>
      <Topbar title="Settings" subtitle="System thresholds and timing" />

      <main className="px-4 sm:px-8 py-6">
        <Card>
          <CardContent className="pt-5">
            {!cfg ? (
              <p className="text-sm text-[var(--color-muted)]">Loading…</p>
            ) : (
              <div className="grid gap-8 max-w-3xl">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">Thresholds &amp; Polling</h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    Stored in <code className="mono">data/config.json</code>. BLE devices and
                    ESP32 scanners are managed under <strong className="text-white">Devices</strong>.
                  </p>
                </div>

                <Slider
                  label="Missed checkpoint tolerance"
                  value={cfg.missed_tolerance_min}
                  onChange={(v) => setCfg({ ...cfg, missed_tolerance_min: v })}
                  min={1} max={60}
                  formatValue={(v) => `${v} min`}
                />

                <Slider
                  label="Heartbeat interval"
                  value={cfg.heartbeat_interval_s}
                  onChange={(v) => setCfg({ ...cfg, heartbeat_interval_s: v })}
                  min={5} max={120}
                  formatValue={(v) => `${v}s`}
                />

                <Slider
                  label="Dashboard auto-refresh"
                  value={cfg.refresh_interval_s}
                  onChange={(v) => setCfg({ ...cfg, refresh_interval_s: v })}
                  min={1} max={120}
                  formatValue={(v) => `${v}s`}
                />

                <Slider
                  label="Session timeout"
                  value={cfg.session_timeout_min}
                  onChange={(v) => setCfg({ ...cfg, session_timeout_min: v })}
                  min={5} max={240}
                  formatValue={(v) => `${v} min`}
                />

                <Slider
                  label="BLE RSSI threshold (closer = stronger signal required)"
                  value={cfg.rssi_threshold}
                  onChange={(v) => setCfg({ ...cfg, rssi_threshold: v })}
                  min={-100} max={-30}
                  formatValue={(v) => `${v} dBm`}
                />

                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={handleSave} disabled={busy}>
                    {busy ? "Saving…" : "Save changes"}
                  </Button>
                  {savedAt && <span className="text-xs text-[var(--color-success)]">Saved at {savedAt}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
