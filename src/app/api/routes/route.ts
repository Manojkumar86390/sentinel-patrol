// ---------------------------------------------------------------------------
// /api/routes  —  list and create patrol routes
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type {
  PatrolRoute,
  RouteAssignment,
  LoopingRouteConfig,
  FixedRouteConfig,
} from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const [routes, assignments] = await Promise.all([
    db.routes.all(),
    db.assignments.all(),
  ]);
  return NextResponse.json({ ok: true, items: routes, assignments });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: Partial<PatrolRoute> & { assignments?: Array<{ ble_mac: string; days_of_week?: string }> };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  // Validate basic fields
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  if (body.route_type !== "looping" && body.route_type !== "fixed") {
    return NextResponse.json({ ok: false, error: "route_type must be 'looping' or 'fixed'" }, { status: 400 });
  }

  // Validate config shape
  let config: LoopingRouteConfig | FixedRouteConfig;
  if (body.route_type === "looping") {
    const c = body.config as LoopingRouteConfig | undefined;
    if (!c || !Array.isArray(c.checkpoints) || c.checkpoints.length === 0) {
      return NextResponse.json({ ok: false, error: "Looping routes need at least one checkpoint" }, { status: 400 });
    }
    config = {
      intervalMin: Math.max(1, Number(c.intervalMin) || 30),
      checkpoints: c.checkpoints.map((s) => String(s).trim()).filter(Boolean),
    };
  } else {
    const c = body.config as FixedRouteConfig | undefined;
    if (!c || !Array.isArray(c.schedule) || c.schedule.length === 0) {
      return NextResponse.json({ ok: false, error: "Fixed routes need at least one schedule entry" }, { status: 400 });
    }
    config = {
      schedule: c.schedule
        .map((s) => ({ time: String(s.time).trim(), espId: String(s.espId).trim() }))
        .filter((s) => s.time && s.espId),
    };
  }

  const route: PatrolRoute = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    description:        (body.description ?? "").trim() || undefined,
    route_type:         body.route_type,
    late_tolerance_min: Math.max(1, Number(body.late_tolerance_min) || 15),
    shift_start:        (body.shift_start ?? "").trim() || undefined,
    shift_end:          (body.shift_end   ?? "").trim() || undefined,
    config,
    active:             body.active !== false,
    created_at:         new Date().toISOString(),
  };
  await db.routes.save(route);

  // Persist any assignments handed in alongside the route
  const assignmentRows: RouteAssignment[] = (body.assignments ?? []).map((a) => ({
    id:           `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    route_id:     route.id,
    ble_mac:      a.ble_mac.toUpperCase(),
    days_of_week: (a.days_of_week && /^[01]{7}$/.test(a.days_of_week)) ? a.days_of_week : "1111111",
    created_at:   new Date().toISOString(),
  }));
  for (const a of assignmentRows) {
    await db.assignments.save(a);
  }

  return NextResponse.json({ ok: true, route, assignments: assignmentRows });
}
