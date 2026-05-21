// ---------------------------------------------------------------------------
// /api/config
//   GET – fetch current admin-configurable settings
//   PUT – update them
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { AppConfig } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const config = await db.config.get();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<AppConfig>;
  const current = await db.config.get();
  const next: AppConfig = {
    missed_tolerance_min: clampN(body.missed_tolerance_min, 1,   240, current.missed_tolerance_min),
    heartbeat_interval_s: clampN(body.heartbeat_interval_s, 5,   600, current.heartbeat_interval_s),
    refresh_interval_s:   clampN(body.refresh_interval_s,   1,   300, current.refresh_interval_s),
    rssi_threshold:       clampN(body.rssi_threshold,      -120, -20, current.rssi_threshold),
    session_timeout_min:  clampN(body.session_timeout_min,  5,  1440, current.session_timeout_min),
  };
  await db.config.save(next);
  return NextResponse.json({ ok: true, config: next });
}

function clampN(v: unknown, lo: number, hi: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}
