"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, PulseDot } from "@/components/ui/badge";
import { useLive } from "@/hooks/use-live";
import { timeAgo, cn } from "@/lib/utils";
import { FiPlus, FiTrash2, FiSearch, FiCpu, FiTag, FiAlertOctagon, FiX } from "react-icons/fi";
import type { Tag, Scanner, EmergencySwitch } from "@/types";

const TABS = [
  { id: "ble",     label: "Bluetooth Tags",        icon: FiTag },
  { id: "esp32",   label: "Scanners",     icon: FiCpu },
  { id: "switch",  label: "Emergency Switches", icon: FiAlertOctagon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DevicesPage() {
  const [tab, setTab] = useState<TabId>("ble");

  return (
    <>
      <Topbar title="Devices" subtitle="Bluetooth tags · Scanners · Emergency switches" />

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
            {tab === "ble"    && <TagsTab />}
            {tab === "esp32"  && <ScannersTab />}
            {tab === "switch" && <EmergencySwitchesTab />}
          </CardContent>
        </Card>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bluetooth Tags
// ---------------------------------------------------------------------------

function TagsTab() {
  const { data: devices, refresh } = useLive<Tag[]>("/api/ble-devices",
    { select: (r) => (r as { items: Tag[] }).items });

  const [query,   setQuery]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const all = devices ?? [];
  const filtered = all.filter((d) =>
    [d.tag_name, d.guard_name, d.mac_address, d.notes]
      .filter(Boolean)
      .join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);

    // Step 1 — if a photo was selected, upload it to Supabase Storage first.
    // We capture the public URL and pass it as photo_url in step 2.
    let photoUrl: string | undefined = undefined;
    const photoFile = fd.get("photo");
    if (photoFile instanceof File && photoFile.size > 0) {
      try {
        const upFd = new FormData();
        upFd.append("file", photoFile);
        const upRes = await fetch("/api/upload/guard-photo", { method: "POST", body: upFd });
        const upJson = await upRes.json();
        if (!upRes.ok || !upJson.ok) {
          setError(upJson.error ?? "Photo upload failed");
          setBusy(false);
          return;
        }
        photoUrl = upJson.url as string;
      } catch (e) {
        setError("Photo upload failed (network error)");
        setBusy(false);
        return;
      }
    }

    // Step 2 — register the Bluetooth tag, including the photo_url if any.
    const payload = {
      mac_address: String(fd.get("mac_address") ?? "").trim(),
      tag_name:    String(fd.get("tag_name") ?? "").trim(),
      guard_name:  String(fd.get("guard_name") ?? "").trim(),
      photo_url:   photoUrl,
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
    if (!confirm("Remove this Bluetooth tag?")) return;
    await fetch(`/api/ble-devices/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <Input
            placeholder="Search by MAC, Bluetooth name, or guard…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd
            ? <><FiX className="h-4 w-4" /> Cancel</>
            : <><FiPlus className="h-4 w-4" /> Register Bluetooth Tag</>}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sm text-[var(--color-muted)] mb-4">
            Add a Bluetooth tag (e.g. HC-05) that guards will carry. Locations are not stored here —
            they come from whichever Scanner detects the tag.
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <Field label="Bluetooth MAC">
              <Input name="mac_address" required placeholder="44:A7:36:85:CB:22" />
            </Field>
            <Field label="Bluetooth Name (as broadcast)">
              <Input name="tag_name" required placeholder="HC-05" />
            </Field>
            <Field label="Guard Name (optional)">
              <Input name="guard_name" placeholder="Rajesh / Night Guard A" />
            </Field>
            <Field label="Notes (optional)">
              <Input name="notes" placeholder="Spare tag, room 102, etc." />
            </Field>
            {/* Photo upload — file input styled to match other Inputs. Only
                JPEG/PNG/WebP up to 5 MB are accepted (server-validated too). */}
            <Field label="Guard Photo (optional)" className="sm:col-span-2">
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-sm text-[var(--color-text)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[var(--color-primary)]/15 file:text-[var(--color-primary)] file:font-medium hover:file:bg-[var(--color-primary)]/25 file:cursor-pointer cursor-pointer rounded-md border border-white/10 bg-white/[0.02] px-3 py-2"
              />
              <p className="text-[10px] text-[var(--color-muted)] mt-1">
                Shown next to the guard&rsquo;s patrol entries in the Logs page. Max 5 MB · JPEG / PNG / WebP.
              </p>
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
              <th className="text-left font-medium py-2.5 px-4">Bluetooth Name</th>
              <th className="text-left font-medium py-2.5 px-4">Guard</th>
              <th className="text-left font-medium py-2.5 px-4">Notes</th>
              <th className="text-right font-medium py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-sm text-[var(--color-muted)]">No Bluetooth tags yet — register one above.</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id} className="border-t border-white/[0.04]">
                <td className="py-2.5 px-4 mono text-xs text-white">{d.mac_address}</td>
                <td className="py-2.5 px-4 text-white">{d.tag_name}</td>
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
// Scanners
// ---------------------------------------------------------------------------

function ScannersTab() {
  const { data: scanners, refresh } = useLive<Scanner[]>("/api/esp32-scanners",
    { select: (r) => (r as { items: Scanner[] }).items });

  const [query,   setQuery]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const all = scanners ?? [];
  const filtered = all.filter((s) =>
    [s.scanner_id, s.location, s.description].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      scanner_id:      String(fd.get("scanner_id") ?? "").trim(),
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
            placeholder="Search by Scanner ID, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd
            ? <><FiX className="h-4 w-4" /> Cancel</>
            : <><FiPlus className="h-4 w-4" /> Register Scanner</>}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sm text-[var(--color-muted)] mb-4">
            Add a Scanner mounted at a fixed checkpoint. The <strong className="text-white">Scanner ID</strong> must
            match the <code className="mono text-[var(--color-primary)]">SCANNER_ID</code> hard-coded in the firmware
            (e.g. <code className="mono text-[var(--color-primary)]">SCANNER-01</code>).
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <Field label="Scanner ID (matches firmware)">
              <Input name="scanner_id" required placeholder="SCANNER-01" />
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
              <th className="text-left font-medium py-2.5 px-4">Scanner ID</th>
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
                <td className="py-2.5 px-4 mono text-xs text-white">{s.scanner_id}</td>
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

// ---------------------------------------------------------------------------
// Emergency Switches (Product 2: panic button device at the guard's desk)
// ---------------------------------------------------------------------------

function EmergencySwitchesTab() {
  const { data: switches, refresh } = useLive<EmergencySwitch[]>("/api/emergency-switches",
    { select: (r) => (r as { items: EmergencySwitch[] }).items });

  const [query,   setQuery]   = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const all = switches ?? [];
  const filtered = all.filter((s) =>
    [s.switch_id, s.location, s.description].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())
  );

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      switch_id:   String(fd.get("switch_id") ?? "").trim(),
      location:    String(fd.get("location")  ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      latitude:    Number(fd.get("latitude")),
      longitude:   Number(fd.get("longitude")),
    };
    try {
      const res = await fetch("/api/emergency-switches", {
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
    if (!confirm("Remove this emergency switch?")) return;
    await fetch(`/api/emergency-switches/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" />
          <Input
            placeholder="Search by switch ID, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAdd((v) => !v)}>
          {showAdd
            ? <><FiX className="h-4 w-4" /> Cancel</>
            : <><FiPlus className="h-4 w-4" /> Register Switch</>}
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-sm text-[var(--color-muted)] mb-4">
            An <strong className="text-white">Emergency Switch</strong> is a separate Scanner module with 4 panic
            buttons (fire / accident / bleeding / fight), kept at the security guard&rsquo;s desk.
            The <strong className="text-white">Switch ID</strong> must match the <code className="mono text-[var(--color-primary)]">SWITCH_ID</code> in
            the firmware (e.g. <code className="mono text-[var(--color-primary)]">SWITCH-01</code>).
            Location is free-form text and is shown on alerts.
            <br/>
            <strong className="text-white">Latitude &amp; Longitude</strong> are used to pin the switch on the alerts map.
            You can get them from Google Maps: right-click a spot &rarr; the first item is the coords. Copy / paste them in.
            Example values near IIITDM Kurnool: lat <code className="mono text-[var(--color-primary)]">15.762034</code>, lng <code className="mono text-[var(--color-primary)]">78.039661</code>.
          </p>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <Field label="Switch ID (matches firmware)">
              <Input name="switch_id" required placeholder="SWITCH-01" />
            </Field>
            <Field label="Location (free text)">
              <Input name="location" required placeholder="Security Desk - Main Gate" />
            </Field>
            <Field label="Latitude">
              <Input
                name="latitude"
                required
                type="number"
                step="any"
                placeholder="15.762034"
              />
            </Field>
            <Field label="Longitude">
              <Input
                name="longitude"
                required
                type="number"
                step="any"
                placeholder="78.039661"
              />
            </Field>
            <Field label="Description (optional)" className="sm:col-span-2">
              <Input name="description" placeholder="e.g. Wall-mounted next to gate cabin" />
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
              <th className="text-left font-medium py-2.5 px-4">Switch ID</th>
              <th className="text-left font-medium py-2.5 px-4">Location</th>
              <th className="text-left font-medium py-2.5 px-4">Coords</th>
              <th className="text-left font-medium py-2.5 px-4">Description</th>
              <th className="text-left font-medium py-2.5 px-4">Last Heartbeat</th>
              <th className="text-left font-medium py-2.5 px-4">Status</th>
              <th className="text-right font-medium py-2.5 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-sm text-[var(--color-muted)]">No emergency switches yet — register one above.</td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-white/[0.04]">
                <td className="py-2.5 px-4 mono text-xs text-white">{s.switch_id}</td>
                <td className="py-2.5 px-4 text-white">{s.location}</td>
                <td className="py-2.5 px-4 mono text-[10px] text-[var(--color-muted)]">
                  {s.latitude.toFixed(5)}, {s.longitude.toFixed(5)}
                </td>
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
