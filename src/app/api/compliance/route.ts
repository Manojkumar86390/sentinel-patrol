// ---------------------------------------------------------------------------
// /api/compliance  —  today's expected-vs-actual table
//
// Polled by the /compliance dashboard page. Recomputes from scratch every
// request — cheap (~100s of events), and means we never need to invalidate
// any cache when patrol events arrive in real time.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { computeCompliance } from "@/lib/compliance";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const [routes, assignments, events, scanners, bleDevices] = await Promise.all([
    db.routes.all(),
    db.assignments.all(),
    db.events.all(),
    db.scanners.all(),
    db.bleDevices.all(),
  ]);

  const summaries = computeCompliance({
    routes, assignments, events, scanners, bleDevices,
  });
  return NextResponse.json({ ok: true, items: summaries, computedAt: new Date().toISOString() });
}
