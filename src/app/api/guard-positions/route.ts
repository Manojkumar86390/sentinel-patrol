import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { computeGuardPositions } from "@/lib/positioning";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/guard-positions
 *
 * Returns an array of GuardPosition objects, one per active guard MAC.
 * Polled by the Live Status map every few seconds.
 *
 * Computation is pure-functional (positioning.ts); we just gather the inputs:
 *   • Recent events (last 30 s of RSSI readings)
 *   • Currently-registered scanners (for location lookup)
 *   • BLE devices table (for human-friendly names)
 *
 * Auth: requires a valid login cookie. ESP32 has no business reading positions.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const [events, scanners, bleDevices] = await Promise.all([
    db.events.all(),
    db.scanners.all(),
    db.bleDevices.all(),
  ]);

  // Pre-build a fast name lookup: mac → { name, guardName? }
  const bleNames = new Map<string, { name: string; guardName?: string }>();
  for (const d of bleDevices) {
    bleNames.set(d.mac_address.toLowerCase(), {
      name:      d.ble_name,
      guardName: d.guard_name,
    });
  }

  const positions = computeGuardPositions(events, scanners, bleNames);
  return NextResponse.json({ ok: true, items: positions, computedAt: new Date().toISOString() });
}
