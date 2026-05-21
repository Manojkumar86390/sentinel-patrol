"use client";

import { Badge, PulseDot } from "@/components/ui/badge";
import { FiCpu, FiActivity, FiCheck, FiClock } from "react-icons/fi";

export function DashboardMockup() {
  return (
    <div className="h-full p-5 grid-bg">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <div className="h-2 w-2 rounded-full bg-[var(--color-danger)]/70" />
        <div className="h-2 w-2 rounded-full bg-[var(--color-warning)]/70" />
        <div className="h-2 w-2 rounded-full bg-[var(--color-success)]/70" />
        <Badge variant="success" className="ml-auto !py-0">
          <PulseDot className="text-[var(--color-success)]" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <MiniStat label="Guards"   value="24" />
        <MiniStat label="Active"   value="11" tone="success" />
        <MiniStat label="Devices"  value="8/8" />
        <MiniStat label="Missed"   value="0"  tone="success" />
      </div>

      <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">Patrols (24h)</p>
        <svg viewBox="0 0 200 50" className="w-full h-14">
          <defs>
            <linearGradient id="mockup-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,40 L20,35 L40,38 L60,28 L80,22 L100,18 L120,12 L140,15 L160,8 L180,12 L200,5"
                fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
          <path d="M0,40 L20,35 L40,38 L60,28 L80,22 L100,18 L120,12 L140,15 L160,8 L180,12 L200,5 L200,50 L0,50 Z"
                fill="url(#mockup-grad)" />
        </svg>
      </div>

      <div className="mt-3 space-y-1.5">
        {[
          { name: "HC-05",        point: "Checkpoint 1", status: "verified" as const, icon: FiCheck },
          { name: "HC-05",        point: "Checkpoint 1", status: "verified" as const, icon: FiCheck },
          { name: "GUARD_TAG_01", point: "Checkpoint 1", status: "verified" as const, icon: FiCheck },
          { name: "NO_DEVICE",    point: "Checkpoint 1", status: "missed"   as const, icon: FiClock },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded bg-white/[0.02] text-[10px]">
            <FiActivity className="h-3 w-3 text-[var(--color-primary)]" />
            <span className="text-white font-medium">{r.name}</span>
            <span className="text-white/40">→</span>
            <span className="text-white/70">{r.point}</span>
            <span
              className={
                "ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] " +
                (r.status === "verified"
                  ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                  : "bg-[var(--color-warning)]/10 text-[var(--color-warning)]")
              }
            >
              <r.icon className="h-2.5 w-2.5" />
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label, value, tone = "default",
}: { label: string; value: string; tone?: "default" | "success" }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
      <p className="text-[9px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className={"text-xl font-semibold mt-0.5 " + (tone === "success" ? "text-[var(--color-success)]" : "text-white")}>
        {value}
      </p>
    </div>
  );
}

export function DatabaseMockup() {
  const tables = [
    { name: "patrol_events",  cols: ["id", "name", "bluetoothMac", "location", "status", "receivedAt"] },
    { name: "devices",        cols: ["id", "device_id", "mac_address", "checkpoint_name", "status"] },
    { name: "guards",         cols: ["id", "guard_code", "name", "shift", "contact"] },
    { name: "config",         cols: ["missed_tolerance_min", "heartbeat_interval_s", "rssi_threshold"] },
  ];

  return (
    <div className="h-full p-5 grid-bg overflow-auto">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <p className="mono text-[10px] text-white/40">json · /data</p>
        <Badge variant="info" className="ml-auto !py-0">4 files</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {tables.map((t) => (
          <div key={t.name} className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.02]">
              <p className="mono text-[11px] text-[var(--color-primary)]">{t.name}</p>
            </div>
            <ul className="p-1.5">
              {t.cols.map((c, i) => (
                <li key={c} className="flex items-center gap-2 px-2 py-1 text-[10px] mono text-white/70">
                  <span className={i === 0 ? "text-[var(--color-warning)]" : "text-white/30"}>
                    {i === 0 ? "🔑" : "·"}
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HardwareMockup() {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="relative">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute inset-0 rounded-full border-2 border-[var(--color-primary)]/30"
            style={{
              animation: "pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              animationDelay: `${i * 0.6}s`,
              width: 240, height: 240, top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            }}
          />
        ))}

        <div className="relative grid place-items-center h-40 w-40 rounded-3xl bg-gradient-to-br from-[#1a1f2e] to-[#0a0d14] ring-1 ring-white/10 shadow-2xl">
          <FiCpu className="h-16 w-16 text-[var(--color-primary)]" />
          <p className="absolute bottom-3 mono text-[10px] text-white/60">ESP32</p>
          <div className="absolute top-2 right-2">
            <PulseDot className="text-[var(--color-success)]" />
          </div>
        </div>

        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 mono text-[10px] text-white/40 text-center whitespace-nowrap">
          <span className="text-[var(--color-primary)]">BLE</span> scan · live
        </div>
      </div>
    </div>
  );
}
