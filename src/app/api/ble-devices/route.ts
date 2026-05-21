// ---------------------------------------------------------------------------
// /api/ble-devices
//   GET  – list registered BLE tags
//   POST – register a new BLE tag (MAC + ble_name + optional guard_name)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { BleDevice } from "@/types";

export const dynamic = "force-dynamic";

function isMac(v: string) {
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(v);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const items = await db.bleDevices.all();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<BleDevice>;
  const mac_address = (body.mac_address ?? "").trim().toUpperCase();
  const ble_name    = (body.ble_name ?? "").trim();
  const guard_name  = (body.guard_name ?? "").trim() || undefined;
  const notes       = (body.notes ?? "").trim() || undefined;

  if (!mac_address || !ble_name) {
    return NextResponse.json(
      { ok: false, error: "mac_address and ble_name are required" },
      { status: 400 }
    );
  }
  if (!isMac(mac_address)) {
    return NextResponse.json(
      { ok: false, error: "mac_address must look like AA:BB:CC:DD:EE:FF" },
      { status: 400 }
    );
  }

  const all = await db.bleDevices.all();
  if (all.some((d) => d.mac_address.toUpperCase() === mac_address)) {
    return NextResponse.json({ ok: false, error: "MAC already registered" }, { status: 409 });
  }

  const device: BleDevice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    mac_address,
    ble_name,
    guard_name,
    notes,
    created_at: new Date().toISOString(),
  };
  all.push(device);
  await db.bleDevices.save(all);
  return NextResponse.json({ ok: true, device });
}
