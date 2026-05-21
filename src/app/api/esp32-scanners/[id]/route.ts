import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body   = await req.json().catch(() => ({}));

  const all = await db.scanners.all();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  all[idx] = {
    ...all[idx],
    location:    (body.location    ?? all[idx].location).trim(),
    description: (body.description ?? all[idx].description ?? "").trim() || undefined,
  };
  await db.scanners.save(all);
  return NextResponse.json({ ok: true, scanner: all[idx] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all  = await db.scanners.all();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.scanners.save(next);
  return NextResponse.json({ ok: true });
}
