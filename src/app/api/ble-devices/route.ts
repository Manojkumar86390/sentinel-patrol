// ---------------------------------------------------------------------------
// /api/ble-devices
//   GET  – list registered Bluetooth tags
//   POST – register a new Bluetooth tag (MAC + tag_name + optional guard_name)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { Tag } from "@/types";

export const dynamic = "force-dynamic";

function isMac(v: string) {
  return /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(v);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const items = await db.tags.all();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<Tag>;
  const mac_address = (body.mac_address ?? "").trim().toUpperCase();
  const tag_name    = (body.tag_name ?? "").trim();
  const guard_name  = (body.guard_name ?? "").trim() || undefined;
  const photo_url   = (body.photo_url  ?? "").trim() || undefined;
  const notes       = (body.notes ?? "").trim() || undefined;

  if (!mac_address || !tag_name) {
    return NextResponse.json(
      { ok: false, error: "mac_address and tag_name are required" },
      { status: 400 }
    );
  }
  if (!isMac(mac_address)) {
    return NextResponse.json(
      { ok: false, error: "mac_address must look like AA:BB:CC:DD:EE:FF" },
      { status: 400 }
    );
  }

  const all = await db.tags.all();
  if (all.some((d) => d.mac_address.toUpperCase() === mac_address)) {
    return NextResponse.json({ ok: false, error: "MAC already registered" }, { status: 409 });
  }

  const device: Tag = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    mac_address,
    tag_name,
    guard_name,
    photo_url,
    notes,
    created_at: new Date().toISOString(),
  };
  all.push(device);
  await db.tags.save(all);
  return NextResponse.json({ ok: true, device });
}
