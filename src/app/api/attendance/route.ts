// ---------------------------------------------------------------------------
// /api/attendance
//   GET – returns the 30-day attendance grid for all registered BLE devices.
//
// Response shape (designed for easy rendering on the client):
//   {
//     ok: true,
//     windowDays: 30,
//     dates: ["YYYY-MM-DD", ...],         // oldest first
//     guards: [
//       {
//         id, label, sublabel,
//         totals: { presentDay, presentNight, absentDay, absentNight },
//         cells: [
//           { date, shift, present, scans },
//           ...
//         ]
//       }
//     ]
//   }
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { buildAttendance } from "@/lib/attendance";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const [bleDevices, events] = await Promise.all([
    db.bleDevices.all(),
    db.events.all(),
  ]);

  const { dates, guards } = buildAttendance(bleDevices, events, 30);

  // Serialize the per-guard cells (Map -> array) for transport.
  const serialized = guards.map((g) => ({
    id: g.id,
    label: g.label,
    sublabel: g.sublabel,
    totals: g.totals,
    cells: Array.from(g.cells.values()),
  }));

  return NextResponse.json({
    ok: true,
    windowDays: 30,
    dates,
    guards: serialized,
  });
}
