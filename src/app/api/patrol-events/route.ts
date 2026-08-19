// ---------------------------------------------------------------------------
// /api/patrol-events
//   GET  – list recent events (newest first). Requires login.
//   POST – Scanner firmware POSTs a scan here. No login required.
//   DELETE – wipe all events. Requires login.
//
// Resolution logic when a POST arrives:
//   1) Look up the Bluetooth MAC in ble-devices.json
//        → resolves the friendly guard_name and tag_name
//   2) Look up the scannerId in esp32-scanners.json
//        → resolves the location and updates last_heartbeat
//   3) Status:
//        - If MAC is "n/a"      → "Missed" (no tag in range)
//        - If scanner not found → "Missed" + location="Unknown"
//        - If MAC not found     → "Verified" but stored as raw name (it's a
//                                 stranger's device, e.g. a phone)
//        - Otherwise            → "Verified"
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { PatrolEvent, EventStatus } from "@/types";

export const dynamic = "force-dynamic";

// ---------- GET ------------------------------------------------------------

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url    = new URL(req.url);
  const limit  = clamp(Number(url.searchParams.get("limit") ?? "100"), 1, 1000);
  const from   = url.searchParams.get("from");
  const to     = url.searchParams.get("to");
  const q      = (url.searchParams.get("q") ?? "").toLowerCase();
  const status = url.searchParams.get("status");

  let events = await db.events.all();

  if (from) events = events.filter((e) => e.date >= from);
  if (to)   events = events.filter((e) => e.date <= to);
  if (status && status !== "all") events = events.filter((e) => e.status === status);
  if (q) {
    events = events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.guardName ?? "").toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.bluetoothMac.toLowerCase().includes(q) ||
        e.scannerId.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({ ok: true, total: events.length, items: events.slice(0, limit) });
}

// ---------- POST -----------------------------------------------------------

export async function POST(req: Request) {
  const deviceToken = req.headers.get("x-device-token");
  if (process.env.DEVICE_TOKEN && deviceToken !== process.env.DEVICE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bad device token" }, { status: 401 });
  }

  // Accept BOTH `espId` (legacy firmware payload) and `scannerId` (newer payload).
  // This keeps existing flashed boards working without a reflash.
  let body: { name?: string; bluetoothMac?: string; scannerId?: string; espId?: string; rssi?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rawName = (body.name ?? "").trim() || "NO_DEVICE";
  const macLow  = (body.bluetoothMac ?? "").trim().toLowerCase() || "n/a";
  const scannerId   = (body.scannerId ?? body.espId ?? "SCANNER-UNKNOWN").trim();
  // RSSI is a signed integer in dBm. Negative for real readings; 0 = unknown.
  // We only store it when present and non-zero (preserves backward compat with
  // older firmware versions that don't send it at all).
  const rssi    = typeof body.rssi === "number" && body.rssi !== 0
                    ? Math.round(body.rssi)
                    : undefined;

  // 1) Resolve scanner → location + heartbeat
  const scanners = await db.scanners.all();
  const scanner  = scanners.find((s) => s.scanner_id === scannerId);

  let location = "Unknown";
  if (scanner) {
    location = scanner.location;
    scanner.last_heartbeat = new Date().toISOString();
    scanner.status = "online";
    await db.scanners.save(scanners);
  }

  // 2) Resolve Bluetooth tag → friendly name
  const tags = await db.tags.all();
  const matchedBle = macLow !== "n/a"
    ? tags.find((d) => d.mac_address.toLowerCase() === macLow)
    : undefined;

  const guardName = matchedBle?.guard_name;

  // 3) Decide status
  let status: EventStatus;
  if (macLow === "n/a" || rawName === "NO_DEVICE") {
    status = "Missed";   // nothing in range
  } else if (!scanner) {
    status = "Missed";   // scanner not registered
  } else {
    status = "Verified"; // real detection at a known scanner
  }

  const now = new Date();
  const event: PatrolEvent = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    name: rawName,
    bluetoothMac: macLow === "n/a" ? "n/a" : macLow,
    guardName,
    scannerId,
    location,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
    status,
    receivedAt: now.toISOString(),
    rssi,
  };

  await db.events.push(event);
  return NextResponse.json({ ok: true, event });
}

// ---------- DELETE ---------------------------------------------------------

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await db.events.save([]);
  return NextResponse.json({ ok: true });
}

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
