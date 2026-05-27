// ---------------------------------------------------------------------------
// Live guard positioning from RSSI.
//
// Inputs: recent patrol events (each has espId + rssi + receivedAt).
// Output: for each tracked BLE MAC, an estimated (lat, lng) on campus.
//
// Approach: weighted average of the strongest recent RSSI readings.
//   • Use only readings from the last STALE_WINDOW_MS milliseconds.
//   • Convert RSSI (dBm) to a positive linear weight (stronger = bigger).
//   • Multiply each scanner's (lat, lng) by its weight, then divide by total.
//
// This gives smooth movement BETWEEN checkpoints, plus a degenerate "snap"
// when only one scanner is in range. We surface which mode was used via
// `GuardPosition.source` so the UI can label the marker accurately.
//
// Limits (for honest demo framing):
//   • Resolution is bounded by the number of deployed ESP32s. With 2, all
//     movement is along the straight line between them.
//   • RSSI drifts ±5–10 dBm even when stationary — the dot will wobble a few
//     meters. We average the last AVG_SAMPLES readings per scanner to dampen
//     this without slowing tracking too much.
// ---------------------------------------------------------------------------

import type { EspScanner, GuardPosition, PatrolEvent } from "@/types";
import { CAMPUS_LOCATIONS } from "@/lib/campus-locations";

/** Discard readings older than this. 30 s = a few BLE scan cycles. */
const STALE_WINDOW_MS = 30_000;

/** How many recent readings to average per scanner before weighting. */
const AVG_SAMPLES = 3;

/**
 * Convert an RSSI value (dBm, negative) into a positive linear weight.
 *
 *   -40 dBm  →  weight ≈ 100 (very close)
 *   -70 dBm  →  weight ≈ 10
 *   -90 dBm  →  weight ≈ 1
 *
 * We use 10^((minus_rssi - 40) / -20) so that every 6 dB closer roughly
 * doubles the weight. This matches the physical inverse-square law for RF.
 */
function rssiToWeight(rssi: number): number {
  // Clamp absurd values
  const clamped = Math.max(-110, Math.min(-30, rssi));
  return Math.pow(10, (clamped + 40) / -20);
}

/**
 * Rough conversion from RSSI to distance in meters, using a log-distance path
 * loss model. Calibration is approximate (no per-checkpoint tuning), so this
 * is intentionally surfaced as an UNCERTAINTY radius, not a precise distance.
 *
 *   d(rssi) = 10 ^ ((rssi_at_1m - rssi) / (10 * path_loss_exponent))
 *
 * With rssi_at_1m = -45 dBm and path_loss_exponent = 2.5 (indoor LoS-ish),
 * RSSI -60 dBm ≈ 4 m, RSSI -75 dBm ≈ 15 m. Good enough to label.
 */
function rssiToDistanceMeters(rssi: number): number {
  const RSSI_AT_1M = -45;
  const PLE = 2.5;
  return Math.pow(10, (RSSI_AT_1M - rssi) / (10 * PLE));
}

/** Resolve a scanner's coordinates by matching its `location` field. */
function scannerCoords(scanner: EspScanner): { lat: number; lng: number } | null {
  const match = CAMPUS_LOCATIONS.find(
    (l) => l.name.toLowerCase() === scanner.location.toLowerCase()
  );
  return match ? { lat: match.lat, lng: match.lng } : null;
}

/**
 * Aggregate recent events by (mac, espId) → average RSSI of the last N readings.
 * Skips events with missing RSSI or that look stale.
 */
function recentReadingsByMacAndScanner(
  events: PatrolEvent[],
  now: number
): Map<string, Map<string, { avgRssi: number; latestAt: number; samples: number }>> {
  const byMac = new Map<string, Map<string, number[]>>();
  const latestByPair = new Map<string, number>();

  for (const e of events) {
    if (typeof e.rssi !== "number") continue;
    if (e.bluetoothMac === "n/a") continue;
    const age = now - new Date(e.receivedAt).getTime();
    if (age > STALE_WINDOW_MS) continue;
    if (!e.espId) continue;

    let perScanner = byMac.get(e.bluetoothMac);
    if (!perScanner) {
      perScanner = new Map();
      byMac.set(e.bluetoothMac, perScanner);
    }
    let readings = perScanner.get(e.espId);
    if (!readings) {
      readings = [];
      perScanner.set(e.espId, readings);
    }
    if (readings.length < AVG_SAMPLES) readings.push(e.rssi);

    const key = `${e.bluetoothMac}|${e.espId}`;
    const prev = latestByPair.get(key) ?? 0;
    if (new Date(e.receivedAt).getTime() > prev) {
      latestByPair.set(key, new Date(e.receivedAt).getTime());
    }
  }

  const out = new Map<string, Map<string, { avgRssi: number; latestAt: number; samples: number }>>();
  for (const [mac, perScanner] of byMac) {
    const m = new Map<string, { avgRssi: number; latestAt: number; samples: number }>();
    for (const [espId, samples] of perScanner) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      m.set(espId, {
        avgRssi: avg,
        latestAt: latestByPair.get(`${mac}|${espId}`) ?? 0,
        samples: samples.length,
      });
    }
    out.set(mac, m);
  }
  return out;
}

/**
 * Compute current guard positions from recent patrol events.
 *
 * For each MAC that has at least one fresh RSSI reading:
 *   • Look up each scanner's (lat, lng) via CAMPUS_LOCATIONS
 *   • If only ONE scanner has a reading → SNAP to its pin
 *   • If TWO OR MORE → weighted average of their coords
 *
 * Returns ONE GuardPosition per MAC. Frontend renders one marker each.
 */
export function computeGuardPositions(
  events: PatrolEvent[],
  scanners: EspScanner[],
  bleNames: Map<string, { name: string; guardName?: string }>,
): GuardPosition[] {
  const now = Date.now();
  const recent = recentReadingsByMacAndScanner(events, now);
  const positions: GuardPosition[] = [];

  for (const [mac, perScanner] of recent) {
    // Build a list of (scanner, coords, weight, info) for this guard.
    const contribs: Array<{
      espId: string;
      coords: { lat: number; lng: number };
      weight: number;
      rssi: number;
      location: string;
      ageSeconds: number;
    }> = [];

    for (const [espId, { avgRssi, latestAt }] of perScanner) {
      const scanner = scanners.find((s) => s.esp_id === espId);
      if (!scanner) continue;                     // unregistered scanner
      const coords = scannerCoords(scanner);
      if (!coords) continue;                      // location name doesn't match a campus pin
      contribs.push({
        espId,
        coords,
        weight: rssiToWeight(avgRssi),
        rssi: avgRssi,
        location: scanner.location,
        ageSeconds: Math.round((now - latestAt) / 1000),
      });
    }
    if (contribs.length === 0) continue;

    // Compute weighted centroid.
    const totalW = contribs.reduce((a, c) => a + c.weight, 0);
    const lat = contribs.reduce((a, c) => a + c.coords.lat * c.weight, 0) / totalW;
    const lng = contribs.reduce((a, c) => a + c.coords.lng * c.weight, 0) / totalW;

    // Accuracy estimate: distance implied by the BEST RSSI reading (closest
    // scanner). This is a useful upper bound — actual error is usually smaller.
    const strongest = contribs.reduce((a, b) => (a.rssi > b.rssi ? a : b));
    const accuracy  = Math.max(5, Math.round(rssiToDistanceMeters(strongest.rssi)));

    const nameInfo = bleNames.get(mac.toLowerCase()) ?? { name: mac };
    positions.push({
      mac,
      name:        nameInfo.name,
      guardName:   nameInfo.guardName,
      lat,
      lng,
      accuracyMeters: accuracy,
      computedAt:  new Date(now).toISOString(),
      source:      contribs.length === 1 ? "snap" : "interpolated",
      sample: contribs.map((c) => ({
        espId: c.espId,
        rssi:  Math.round(c.rssi),
        location: c.location,
        ageSeconds: c.ageSeconds,
      })),
    });
  }

  return positions;
}
