import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body   = await req.json().catch(() => ({}));

  const all = await db.bleDevices.all();
  const idx = all.findIndex((d) => d.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  all[idx] = {
    ...all[idx],
    ble_name:   (body.ble_name   ?? all[idx].ble_name).trim(),
    guard_name: (body.guard_name ?? all[idx].guard_name ?? "").trim() || undefined,
    notes:      (body.notes      ?? all[idx].notes ?? "").trim() || undefined,
  };
  await db.bleDevices.save(all);
  return NextResponse.json({ ok: true, device: all[idx] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all  = await db.bleDevices.all();
  const next = all.filter((d) => d.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.bleDevices.save(next);
  return NextResponse.json({ ok: true });
}
