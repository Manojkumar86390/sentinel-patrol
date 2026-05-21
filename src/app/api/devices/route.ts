// ---------------------------------------------------------------------------
// /api/devices
//   GET  – list registered BLE devices / checkpoints
//   POST – register a new device (MAC + checkpoint name + location)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { RegisteredDevice } from "@/types";

export const dynamic = "force-dynamic";

function isMac(v: string) {
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(v);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const devices = await db.devices.all();
  // Recompute online/offline based on last_heartbeat (older than 2 minutes → offline)
  const now = Date.now();
  const refreshed = devices.map((d) => ({
    ...d,
    status: now - new Date(d.last_heartbeat).getTime() < 2 * 60_000 ? "online" : "offline",
  })) as RegisteredDevice[];

  return NextResponse.json({ ok: true, items: refreshed });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Partial<RegisteredDevice>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const device_id       = (body.device_id ?? "").trim();
  const mac_address     = (body.mac_address ?? "").trim().toUpperCase();
  const checkpoint_name = (body.checkpoint_name ?? "").trim();
  const location        = (body.location ?? "").trim();

  if (!device_id || !mac_address || !checkpoint_name) {
    return NextResponse.json(
      { ok: false, error: "device_id, mac_address and checkpoint_name are required" },
      { status: 400 }
    );
  }
  if (!isMac(mac_address)) {
    return NextResponse.json(
      { ok: false, error: "mac_address must look like AA:BB:CC:DD:EE:FF" },
      { status: 400 }
    );
  }

  const all = await db.devices.all();
  if (all.some((d) => d.mac_address.toUpperCase() === mac_address)) {
    return NextResponse.json({ ok: false, error: "MAC already registered" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const device: RegisteredDevice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    device_id,
    mac_address,
    checkpoint_name,
    location,
    status: "offline",
    last_heartbeat: now,
    created_at: now,
  };
  all.push(device);
  await db.devices.save(all);
  return NextResponse.json({ ok: true, device });
}
