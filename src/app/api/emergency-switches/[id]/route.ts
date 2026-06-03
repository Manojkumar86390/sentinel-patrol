// ---------------------------------------------------------------------------
// /api/emergency-switches/[id]
//   PUT    – update a registered switch's location / description
//   DELETE – unregister a switch
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body   = await req.json().catch(() => ({}));

  const all = await db.switches.all();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Carefully accept partial updates — only fields the caller actually sent
  // are touched. Coordinates remain valid numbers if not in the payload.
  const next = { ...all[idx] };
  if (typeof body.location === "string")       next.location    = body.location.trim();
  if (typeof body.description === "string")    next.description = body.description.trim() || undefined;
  if (body.latitude  !== undefined) {
    const v = Number(body.latitude);
    if (Number.isFinite(v) && v >= -90 && v <= 90) next.latitude = v;
  }
  if (body.longitude !== undefined) {
    const v = Number(body.longitude);
    if (Number.isFinite(v) && v >= -180 && v <= 180) next.longitude = v;
  }

  all[idx] = next;
  await db.switches.save(all);
  return NextResponse.json({ ok: true, switch: all[idx] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all  = await db.switches.all();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.switches.save(next);
  return NextResponse.json({ ok: true });
}
