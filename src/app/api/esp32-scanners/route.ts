// ---------------------------------------------------------------------------
// /api/esp32-scanners
//   GET  – list registered ESP32 scanners (online/offline recomputed live)
//   POST – register a new ESP32 scanner with a location
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { EspScanner } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const scanners = await db.scanners.all();
  const now = Date.now();
  const refreshed = scanners.map((s) => ({
    ...s,
    status: now - new Date(s.last_heartbeat).getTime() < 2 * 60_000 ? "online" : "offline",
  })) as EspScanner[];

  return NextResponse.json({ ok: true, items: refreshed });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<EspScanner>;
  const esp_id      = (body.esp_id ?? "").trim();
  const location    = (body.location ?? "").trim();
  const description = (body.description ?? "").trim() || undefined;

  if (!esp_id || !location) {
    return NextResponse.json(
      { ok: false, error: "esp_id and location are required" },
      { status: 400 }
    );
  }

  const all = await db.scanners.all();
  if (all.some((s) => s.esp_id.toLowerCase() === esp_id.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "esp_id already registered" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const scanner: EspScanner = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    esp_id,
    location,
    description,
    status: "offline",
    last_heartbeat: now,
    created_at: now,
  };
  all.push(scanner);
  await db.scanners.save(all);
  return NextResponse.json({ ok: true, scanner });
}
