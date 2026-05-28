// ---------------------------------------------------------------------------
// Demo mode simulator.
//
// Generates fake GuardPosition data CLIENT-SIDE so the live map looks alive
// without needing real ESP32 hardware. Used in two places:
//   1. /live?demo=1     — landing page "See Demo" CTA opens this
//   2. /live with the   — toggle inside the live status header
//      "Demo Mode" toggle
//
// The simulator drives 2-3 guards each walking a 30-second loop between
// adjacent campus checkpoints. RSSI values are synthesized so the rest of the
// app (ticker direction arrows, accuracy ring) reacts naturally.
//
// IMPORTANT: This never writes to the database. It only overrides what the
// frontend renders. Real ESP32 events continue to flow into Supabase as
// usual. The override is purely visual.
// ---------------------------------------------------------------------------

import { CAMPUS_LOCATIONS } from "@/lib/campus-locations";
import type { GuardPosition } from "@/types";

interface FakeGuard {
  mac: string;
  name: string;
  guardName: string;
  /** ESP32 IDs the guard cycles between (must exist or be made up). */
  fromEsp: string;
  toEsp: string;
  /** From → To progress, ranges 0..1..0..1 in a triangle wave. */
  loopMs: number;
  /** Phase offset (seconds) so guards aren't all in sync. */
  phaseOffsetMs: number;
}

/** Fixed cast of demo guards. Names match the team for a nice touch. */
const DEMO_GUARDS: FakeGuard[] = [
  {
    mac: "DEMO:AA:11:22:33:44",
    name: "HC-05",
    guardName: "Manoj",
    fromEsp: "ESP32-DEMO-MAIN-GATE",
    toEsp:   "ESP32-DEMO-ECE-BLOCK",
    loopMs: 30_000,
    phaseOffsetMs: 0,
  },
  {
    mac: "DEMO:BB:55:66:77:88",
    name: "GUARD_TAG_01",
    guardName: "Mridul",
    fromEsp: "ESP32-DEMO-ECE-BLOCK",
    toEsp:   "ESP32-DEMO-SPORTS",
    loopMs: 30_000,
    phaseOffsetMs: 10_000,   // start 10s into the loop
  },
  {
    mac: "DEMO:CC:99:AA:BB:CC",
    name: "HC-05",
    guardName: "Sai Krishna",
    fromEsp: "ESP32-DEMO-SPORTS",
    toEsp:   "ESP32-DEMO-MVHR-HOSTEL",
    loopMs: 30_000,
    phaseOffsetMs: 20_000,
  },
];

/** Triangle wave: 0 → 1 → 0 → 1 over `period` ms. Used so guards walk back-and-forth. */
function triangleWave(elapsedMs: number, period: number): number {
  const t = ((elapsedMs % period) / period) * 2;
  return t <= 1 ? t : 2 - t;
}

/**
 * Build a snapshot of fake guard positions for the current moment.
 * Call this every few hundred ms; the caller decides the refresh rate.
 */
export function generateDemoPositions(now: number = Date.now()): GuardPosition[] {
  const checkpointByName = new Map<string, { lat: number; lng: number }>();
  for (const loc of CAMPUS_LOCATIONS) {
    checkpointByName.set(loc.name, { lat: loc.lat, lng: loc.lng });
  }

  // Map each guard's fromEsp/toEsp to specific campus pins (round-robin order).
  // We just take checkpoints in array order — should be 4 of them.
  const checkpoints = CAMPUS_LOCATIONS;
  if (checkpoints.length < 2) return [];

  return DEMO_GUARDS.map((g, idx) => {
    // Pick two checkpoints for this guard from the list
    const a = checkpoints[idx % checkpoints.length];
    const b = checkpoints[(idx + 1) % checkpoints.length];

    const progress = triangleWave(now + g.phaseOffsetMs, g.loopMs);
    const lat = a.lat + (b.lat - a.lat) * progress;
    const lng = a.lng + (b.lng - a.lng) * progress;

    // Synthesize RSSI: stronger of the two scanners is the one we're moving toward
    // (or just left, on the return half). RSSI ranges roughly -45 (very close) to
    // -85 (far). Use the SAME triangle wave to drive the swing.
    const rssiNear = -45 - Math.round(8 * Math.abs(0.5 - progress) * 2); // best near checkpoints
    const rssiFar  = -55 - Math.round(20 * (progress > 0.5 ? 1 - progress : progress) * 2);

    return {
      mac:       g.mac,
      name:      g.name,
      guardName: g.guardName,
      lat,
      lng,
      // Accuracy estimate scaled with distance from nearest checkpoint
      accuracyMeters: Math.max(4, Math.round(6 + 14 * Math.abs(0.5 - progress) * 2)),
      computedAt: new Date(now).toISOString(),
      source: "interpolated" as const,
      sample: [
        {
          espId: progress < 0.5 ? `ESP32-DEMO-${slug(a.name)}` : `ESP32-DEMO-${slug(b.name)}`,
          rssi: rssiNear,
          location: progress < 0.5 ? a.name : b.name,
          ageSeconds: 1,
        },
        {
          espId: progress < 0.5 ? `ESP32-DEMO-${slug(b.name)}` : `ESP32-DEMO-${slug(a.name)}`,
          rssi: rssiFar,
          location: progress < 0.5 ? b.name : a.name,
          ageSeconds: 1,
        },
      ],
    };
  });
}

function slug(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}
