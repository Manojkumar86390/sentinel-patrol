// ---------------------------------------------------------------------------
// /api/attendance/csv?type=matrix    – Date×Guard cross-tab
// /api/attendance/csv?type=individual – One guard per section, with totals
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { buildAttendance } from "@/lib/attendance";

export const dynamic = "force-dynamic";

function csvField(v: string | number | undefined): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url  = new URL(req.url);
  const type = url.searchParams.get("type") ?? "matrix";

  const [bleDevices, events] = await Promise.all([
    db.bleDevices.all(),
    db.events.all(),
  ]);
  const { dates, guards } = buildAttendance(bleDevices, events, 30);

  let csv = "";
  let filename = "attendance.csv";

  if (type === "individual") {
    csv = buildIndividualCsv(dates, guards);
    filename = `attendance-individual-${todayStamp()}.csv`;
  } else {
    csv = buildMatrixCsv(dates, guards);
    filename = `attendance-matrix-${todayStamp()}.csv`;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function todayStamp(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("");
}

// ---------------------------------------------------------------------------
// Matrix CSV
//
//   Date, GuardA (Day), GuardA (Night), GuardB (Day), GuardB (Night), ...
//   YYYY-MM-DD, Present, Absent, Present, Present, ...
// ---------------------------------------------------------------------------
function buildMatrixCsv(dates: string[], guards: ReturnType<typeof buildAttendance>["guards"]) {
  const header = ["Date"];
  for (const g of guards) {
    header.push(`${g.label} (Day)`);
    header.push(`${g.label} (Night)`);
  }

  const rows = dates.map((date) => {
    const row = [date];
    for (const g of guards) {
      const dayCell   = g.cells.get(`${date}|day`);
      const nightCell = g.cells.get(`${date}|night`);
      row.push(dayCell?.present   ? "Present" : "Absent");
      row.push(nightCell?.present ? "Present" : "Absent");
    }
    return row;
  });

  const totals: string[] = ["Totals"];
  for (const g of guards) {
    totals.push(`Present ${g.totals.presentDay} / Absent ${g.totals.absentDay}`);
    totals.push(`Present ${g.totals.presentNight} / Absent ${g.totals.absentNight}`);
  }

  const all = [header, ...rows, [], totals];
  return "\uFEFF" + all.map((r) => r.map(csvField).join(",")).join("\r\n");
}

// ---------------------------------------------------------------------------
// Individual CSV
//
//   Guard: Rajesh (HC-05 · 44:A7:...)
//   Date, Day Shift, Night Shift
//   YYYY-MM-DD, Present, Absent
//   ...
//   Totals, Present 18 / Absent 12, Present 22 / Absent 8
//
//   <blank line>
//   Guard: <next guard>
//   ...
// ---------------------------------------------------------------------------
function buildIndividualCsv(dates: string[], guards: ReturnType<typeof buildAttendance>["guards"]) {
  const out: string[][] = [];

  for (let gi = 0; gi < guards.length; gi++) {
    const g = guards[gi];
    out.push([`Guard: ${g.label}  (${g.sublabel})`]);
    out.push(["Date", "Day Shift (06:00-18:00)", "Night Shift (18:00-06:00)"]);

    for (const date of dates) {
      const dayCell   = g.cells.get(`${date}|day`);
      const nightCell = g.cells.get(`${date}|night`);
      out.push([
        date,
        dayCell?.present   ? "Present" : "Absent",
        nightCell?.present ? "Present" : "Absent",
      ]);
    }

    out.push([
      "Totals",
      `Present ${g.totals.presentDay} / Absent ${g.totals.absentDay}`,
      `Present ${g.totals.presentNight} / Absent ${g.totals.absentNight}`,
    ]);

    if (gi < guards.length - 1) out.push([]);  // blank line between guards
  }

  return "\uFEFF" + out.map((r) => r.map(csvField).join(",")).join("\r\n");
}
