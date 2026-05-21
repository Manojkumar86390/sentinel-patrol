// ---------------------------------------------------------------------------
// /api/guards
//   GET  – list registered guards
//   POST – add a new guard
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { RegisteredGuard } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const items = await db.guards.all();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<RegisteredGuard>;
  const guard_code = (body.guard_code ?? "").trim();
  const name       = (body.name ?? "").trim();
  const shift      = (body.shift ?? "morning") as RegisteredGuard["shift"];
  const contact    = (body.contact ?? "").trim();

  if (!guard_code || !name) {
    return NextResponse.json(
      { ok: false, error: "guard_code and name are required" },
      { status: 400 }
    );
  }

  const all = await db.guards.all();
  if (all.some((g) => g.guard_code.toLowerCase() === guard_code.toLowerCase())) {
    return NextResponse.json({ ok: false, error: "Guard code already exists" }, { status: 409 });
  }

  const guard: RegisteredGuard = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    guard_code,
    name,
    shift,
    contact,
    status: "on-duty",
    created_at: new Date().toISOString(),
  };
  all.push(guard);
  await db.guards.save(all);
  return NextResponse.json({ ok: true, guard });
}
