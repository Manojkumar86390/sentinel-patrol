// ---------------------------------------------------------------------------
// /api/routes/[id]  —  update or delete a single route
// (Assignments cascade-delete via the FK in the SQL schema.)
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { PatrolRoute, RouteAssignment } from "@/types";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body: Partial<PatrolRoute> & { assignments?: Array<{ ble_mac: string; days_of_week?: string }> }
    = await req.json().catch(() => ({}));

  const all = await db.routes.all();
  const existing = all.find((r) => r.id === id);
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const next: PatrolRoute = {
    ...existing,
    name:               body.name ? String(body.name).trim() : existing.name,
    description:        body.description !== undefined
                          ? (String(body.description).trim() || undefined)
                          : existing.description,
    route_type:         body.route_type ?? existing.route_type,
    late_tolerance_min: body.late_tolerance_min !== undefined
                          ? Math.max(1, Number(body.late_tolerance_min))
                          : existing.late_tolerance_min,
    shift_start:        body.shift_start !== undefined
                          ? (String(body.shift_start).trim() || undefined)
                          : existing.shift_start,
    shift_end:          body.shift_end !== undefined
                          ? (String(body.shift_end).trim() || undefined)
                          : existing.shift_end,
    config:             body.config ?? existing.config,
    active:             body.active !== undefined ? !!body.active : existing.active,
  };
  await db.routes.save(next);

  // If assignments are provided, REPLACE all current assignments for this route.
  if (Array.isArray(body.assignments)) {
    await db.assignments.deleteForRoute(id);
    const rows: RouteAssignment[] = body.assignments.map((a) => ({
      id:           `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      route_id:     id,
      ble_mac:      a.ble_mac.toUpperCase(),
      days_of_week: (a.days_of_week && /^[01]{7}$/.test(a.days_of_week)) ? a.days_of_week : "1111111",
      created_at:   new Date().toISOString(),
    }));
    for (const r of rows) await db.assignments.save(r);
  }

  return NextResponse.json({ ok: true, route: next });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  // FK cascade in SQL will remove assignments — but we delete them explicitly
  // as well so the operation is robust even if the FK isn't enforced.
  await db.assignments.deleteForRoute(id);
  await db.routes.delete(id);
  return NextResponse.json({ ok: true });
}
