// ---------------------------------------------------------------------------
// /api/devices/[id]
//   PUT    – update a registered device
//   DELETE – remove a registered device
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const all = await db.devices.all();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  all[idx] = {
    ...all[idx],
    device_id:       (body.device_id ?? all[idx].device_id).trim(),
    checkpoint_name: (body.checkpoint_name ?? all[idx].checkpoint_name).trim(),
    location:        (body.location ?? all[idx].location).trim(),
  };
  await db.devices.save(all);
  return NextResponse.json({ ok: true, device: all[idx] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all = await db.devices.all();
  const next = all.filter((d) => d.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.devices.save(next);
  return NextResponse.json({ ok: true });
}
