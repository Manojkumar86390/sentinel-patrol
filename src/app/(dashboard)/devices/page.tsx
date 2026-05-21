"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, PulseDot } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { timeAgo, cn } from "@/lib/utils";
import { FiPlus, FiTrash2, FiSearch, FiCpu, FiTag, FiRadio, FiX } from "react-icons/fi";
import type { BleDevice, EspScanner } from "@/types";

const TABS = [
  { id: "ble",   label: "BLE Devices",     icon: FiTag },
  { id: "esp32", label: "ESP32 Scanners",  icon: FiCpu },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DevicesPage() {
  const [tab, setTab] = useState<TabId>("ble");

  return (
    <>
      <Topbar title="Devices" subtitle="BLE tags worn by guards + ESP32 scanners at checkpoints" />

      <main className="px-4 sm:px-8 py-6 space-y-4">
        <Card>
          <div className="flex overflow-x-auto border-b border-white/[0.04]">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm transition-colors border-b-2 -mb-px shrink-0",
                  tab === id
                    ? "border-[var(--color-primary)] text-white"
                    : "border-transparent text-[var(--color-muted)] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <CardContent className="pt-5">
            {tab === "ble"   && <BleDevicesTab />}
            {tab === "esp32" && <EspScannersTab />}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// BLE Devices
// ---------------------------------------------------------------------------

function BleDevicesTab() {
  const { data: devices, refresh } = useLive<BleDevice[]>("/api/ble-devices",
    { select: (r) => (r as { items: BleDevice[] }).items });

  const [query,   setQuery]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const all = devices ?? [];
  const filtered = all.filter((d) =>
    [d.ble_name, d.guard_name, d.mac_address, d.notes]
      .filter(Boolean)
      .join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      mac_address: String(fd.get("mac_address") ?? "").trim(),
      ble_name:    String(fd.get("ble_name") ?? "").trim(),
      guard_name:  String(fd.get("guard_name") ?? "").trim(),
      notes:       String(fd.get("notes") ?? "").trim(),
    };
    try {
      const res = await fetch("/api/ble-devices", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed");
        return;
      }
      setShowAdd(false);
      (e.target as HTMLFormElement).reset();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this BLE device?")) return;
    await fetch(`/api/ble-devices/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <Input
            placeholder="Search by MAC, BLE name, or guard…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd
            ? <><FiX className="h-4 w-4" /> Cancel</>
            : <><FiPlus className="h-4 w-4" /> Register BLE Device</>}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sm text-[var(--color-muted)] mb-4">
            Add a BLE tag (e.g. HC-05) that guards will carry. Locations are not stored here —
            they come from whichever ESP32 scanner detects the tag.
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <Field label="Bluetooth MAC">
              <Input name="mac_address" required placeholder="44:A7:36:85:CB:22" />
            </Field>
            <Field label="BLE Name (as broadcast)">
              <Input name="ble_name" required placeholder="HC-05" />
            </Field>
            <Field label="Guard Name (optional)">
              <Input name="guard_name" placeholder="Rajesh / Night Guard A" />
            </Field>
            <Field label="Notes (optional)">
              <Input name="notes" placeholder="Spare tag, room 102, etc." />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Register"}</Button>
              {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] bg-white/[0.02]">
              <th className="text-left font-medium py-2.5 px-4">MAC</th>
              <th className="text-left font-medium py-2.5 px-4">BLE Name</th>
              <th className="text-left font-medium py-2.5 px-4">Guard</th>
              <th className="text-left font-medium py-2.5 px-4">Notes</th>
              <th className="text-right font-medium py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-[var(--color-muted)]">No BLE devices yet — register one above.</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-white/[0.04]">
                <td className="py-2.5 px-4 mono text-xs text-white">{d.mac_address}</td>
                <td className="py-2.5 px-4 text-white">{d.ble_name}</td>
                <td className="py-2.5 px-4 text-[var(--color-muted)]">{d.guard_name ?? "—"}</td>
                <td className="py-2.5 px-4 text-xs text-[var(--color-muted)]">{d.notes ?? "—"}</td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => handleDelete(d.id)}
                    aria-label="Delete"
                    className="grid h-7 w-7 ml-auto place-items-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ESP32 Scanners
// ---------------------------------------------------------------------------

function EspScannersTab() {
  const { data: scanners, refresh } = useLive<EspScanner[]>("/api/esp32-scanners",
    { select: (r) => (r as { items: EspScanner[] }).items });

  const [query,   setQuery]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const all = scanners ?? [];
  const filtered = all.filter((s) =>
    [s.esp_id, s.location, s.description].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      esp_id:      String(fd.get("esp_id") ?? "").trim(),
      location:    String(fd.get("location") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
    };
    try {
      const res = await fetch("/api/esp32-scanners", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed");
        return;
      }
      setShowAdd(false);
      (e.target as HTMLFormElement).reset();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this scanner?")) return;
    await fetch(`/api/esp32-scanners/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <Input
            placeholder="Search by ESP ID, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd
            ? <><FiX className="h-4 w-4" /> Cancel</>
            : <><FiPlus className="h-4 w-4" /> Register ESP32</>}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sm text-[var(--color-muted)] mb-4">
            Add an ESP32 scanner mounted at a fixed checkpoint. The <strong className="text-white">ESP ID</strong> must
            match the <code className="mono text-[var(--color-primary)]">ESP_ID</code> hard-coded in the firmware
            (e.g. <code className="mono text-[var(--color-primary)]">ESP32-SCANNER-01</code>).
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <Field label="ESP ID (matches firmware)">
              <Input name="esp_id" required placeholder="ESP32-SCANNER-01" />
            </Field>
            <Field label="Location / Checkpoint">
              <Input name="location" required placeholder="Hostel Gate" />
            </Field>
            <Field label="Description (optional)" className="sm:col-span-2">
              <Input name="description" placeholder="Main entrance, west side, etc." />
            </Field>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Register"}</Button>
              {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)] bg-white/[0.02]">
              <th className="text-left font-medium py-2.5 px-4">ESP ID</th>
              <th className="text-left font-medium py-2.5 px-4">Location</th>
              <th className="text-left font-medium py-2.5 px-4">Description</th>
              <th className="text-left font-medium py-2.5 px-4">Last Heartbeat</th>
              <th className="text-left font-medium py-2.5 px-4">Status</th>
              <th className="text-right font-medium py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-sm text-[var(--color-muted)]">No scanners yet — register one above.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-white/[0.04]">
                <td className="py-2.5 px-4 mono text-xs text-white">{s.esp_id}</td>
                <td className="py-2.5 px-4 text-white">{s.location}</td>
                <td className="py-2.5 px-4 text-xs text-[var(--color-muted)]">{s.description ?? "—"}</td>
                <td className="py-2.5 px-4 mono text-xs text-[var(--color-muted)]">{timeAgo(s.last_heartbeat)}</td>
                <td className="py-2.5 px-4">
                  <Badge variant={s.status === "online" ? "success" : "danger"}>
                    <PulseDot className={s.status === "online" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"} />
                    {s.status}
                  </Badge>
                </td>
                <td className="py-2.5 px-4 text-right">
                  <button
                    onClick={() => handleDelete(s.id)}
                    aria-label="Delete"
                    className="grid h-7 w-7 ml-auto place-items-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs text-[var(--color-muted)] uppercase tracking-[0.12em]">{label}</label>
      {children}
    </div>
  );
}
