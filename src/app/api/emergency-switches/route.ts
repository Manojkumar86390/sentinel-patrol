// ---------------------------------------------------------------------------
// /api/emergency-switches
//   GET  – list registered Emergency Switches (online/offline recomputed live)
//   POST – register a new Emergency Switch with a free-form location
//
// Mirrors /api/esp32-scanners exactly, but operates on the emergency_switches
// table. Emergency switches are a separate product (Product 2) — they only do
// panic-button signaling, no BLE scanning.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { EmergencySwitch } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const switches = await db.switches.all();
  const now = Date.now();
  const refreshed = switches.map((s) => ({
    ...s,
    // Same 2-minute threshold as scanners — keeps the UX consistent.
    status: now - new Date(s.last_heartbeat).getTime() < 2 * 60_000 ? "online" : "offline",
  })) as EmergencySwitch[];

  return NextResponse.json({ ok: true, items: refreshed });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<EmergencySwitch>;
  const switch_id   = (body.switch_id ?? "").trim();
  const location    = (body.location ?? "").trim();
  const description = (body.description ?? "").trim() || undefined;

  if (!switch_id || !location) {
    return NextResponse.json(
      { ok: false, error: "switch_id and location are required" },
      { status: 400 }
    );
  }

  const all = await db.switches.all();
  if (all.some((s) => s.switch_id.toLowerCase() === switch_id.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "switch_id already registered" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const sw: EmergencySwitch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    switch_id,
    location,
    description,
    status: "offline",
    last_heartbeat: now,
    created_at: now,
  };
  all.push(sw);
  await db.switches.save(all);
  return NextResponse.json({ ok: true, switch: sw });
}
