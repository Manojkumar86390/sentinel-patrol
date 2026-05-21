// ---------------------------------------------------------------------------
// /api/emergency-alerts/[id]   PUT  – acknowledge an alert
//                              DELETE – remove a single alert
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body   = (await req.json().catch(() => ({}))) as { action?: string };

  const all = await db.alerts.all();
  const idx = all.findIndex((a) => a.id === id);
  if (idx < 0) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (body.action === "unacknowledge") {
    all[idx] = {
      ...all[idx],
      acknowledged: false,
      acknowledgedAt: undefined,
      acknowledgedBy: undefined,
    };
  } else {
    all[idx] = {
      ...all[idx],
      acknowledged: true,
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: user.name ?? "admin",
    };
  }

  await db.alerts.save(all);
  return NextResponse.json({ ok: true, alert: all[idx] });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const all = await db.alerts.all();
  const next = all.filter((a) => a.id !== id);
  if (next.length === all.length) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  await db.alerts.save(next);
  return NextResponse.json({ ok: true });
}
