// ---------------------------------------------------------------------------
// /api/last-scan-positions
//
// Reads recent patrol events and, for each Bluetooth MAC seen in the last
// MAX_AGE_MIN minutes, returns its MOST RECENT detection — anchored to the
// scanner's registered location coordinates.
//
// This is the more conservative alternative to /api/guard-positions:
//   - guard-positions uses RSSI trilateration (smooth, but noisy)
//   - last-scan-positions snaps each guard to whichever checkpoint scanned
//     them most recently (accurate at the checkpoint, but quantized)
//
// The frontend lets the user toggle between these two modes on the live page.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { CAMPUS_LOCATIONS } from "@/lib/campus-locations";
import type { GuardPosition } from "@/types";

export const dynamic = "force-dynamic";

/** Hide a guard's marker if they haven't been scanned in this many minutes. */
const MAX_AGE_MIN = 30;

/**
 * Stable per-MAC offset (small angular displacement around the checkpoint)
 * so that two guards at the same scanner don't render directly on top of
 * each other. The offset is deterministic — same MAC always lands at the
 * same spot, so the marker doesn't jitter between renders.
 *
 * ~0.0001 degrees ≈ 10–11 meters at this latitude, which is roughly the
 * radius of a checkpoint area in real life. Looks natural on the map.
 */
function offsetForMac(
  mac: string,
  base: { lat: number; lng: number },
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < mac.length; i++) {
    hash = (hash * 31 + mac.charCodeAt(i)) >>> 0;
  }
  const angle  = (hash / 0xFFFFFFFF) * 2 * Math.PI;
  const RADIUS = 0.00010;
  return {
    lat: base.lat + RADIUS * Math.cos(angle),
    lng: base.lng + RADIUS * Math.sin(angle),
  };
}

export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const [events, scanners, tags] = await Promise.all([
    db.events.all(),
    db.scanners.all(),
    db.tags.all(),
  ]);

  // Lookup tables for fast resolution.
  const scannerByEspId = new Map(scanners.map((s) => [s.scanner_id, s] as const));
  const bleByMac = new Map<string, { name: string; guardName?: string }>();
  for (const d of tags) {
    bleByMac.set(d.mac_address.toLowerCase(), {
      name:      d.tag_name,
      guardName: d.guard_name,
    });
  }

  // Sweep events oldest-first; the LATEST one per MAC wins. We could
  // also sort desc and take the first per MAC — same outcome, but doing
  // it this way avoids dependence on the source ordering.
  const latestByMac = new Map<string, typeof events[0]>();
  for (const e of events) {
    if (!e.bluetoothMac || e.bluetoothMac === "n/a") continue;   // NO_DEVICE events
    if (e.name === "NO_DEVICE") continue;
    const macLow = e.bluetoothMac.toLowerCase();
    const existing = latestByMac.get(macLow);
    if (!existing || new Date(e.receivedAt) > new Date(existing.receivedAt)) {
      latestByMac.set(macLow, e);
    }
  }

  const now = Date.now();
  const cutoffMs = now - MAX_AGE_MIN * 60_000;
  const positions: GuardPosition[] = [];

  for (const [mac, ev] of latestByMac) {
    const t = new Date(ev.receivedAt).getTime();
    if (t < cutoffMs) continue;                    // too old, hide

    // Find the scanner that produced this event, then its checkpoint coords.
    const scanner = scannerByEspId.get(ev.scannerId);
    if (!scanner) continue;                        // unregistered scanner
    const pin = CAMPUS_LOCATIONS.find(
      (p) => p.name.toLowerCase() === scanner.location.toLowerCase(),
    );
    if (!pin) continue;                            // location not on the map

    const offset = offsetForMac(mac, { lat: pin.lat, lng: pin.lng });
    const nameInfo = bleByMac.get(mac) ?? { name: ev.name };
    const ageSec   = Math.round((now - t) / 1000);

    positions.push({
      mac:        mac.toUpperCase(),
      name:       nameInfo.name,
      guardName:  nameInfo.guardName,
      lat:        offset.lat,
      lng:        offset.lng,
      // Accuracy is roughly the checkpoint coverage radius (15m baseline).
      // We grow it slowly with staleness so old detections look less certain.
      accuracyMeters: Math.min(60, 15 + Math.floor(ageSec / 60) * 3),
      computedAt: new Date(now).toISOString(),
      source:     "snap",                          // explicitly snap-to-scanner
      sample: [
        {
          scannerId:      ev.scannerId,
          rssi:       ev.rssi ?? 0,
          location:   scanner.location,
          ageSeconds: ageSec,
        },
      ],
    });
  }

  return NextResponse.json({
    ok: true,
    items: positions,
    computedAt: new Date(now).toISOString(),
  });
}
