// ---------------------------------------------------------------------------
// Attendance computation.
//
// Rules:
//   - Day shift   = 06:00 - 18:00  (local time of the receivedAt timestamp)
//   - Night shift = 18:00 - 06:00  (spans midnight; a scan at 23:00 belongs
//                                   to that calendar date's night shift,
//                                   and a scan at 02:00 belongs to the
//                                   PREVIOUS calendar date's night shift)
//   - A guard is Present for a (date, shift) cell if AT LEAST ONE of their
//     registered BLE devices has a Verified scan in that window.
//   - Only registered BLE devices count. Anonymous MACs are ignored.
//   - Rolling 30-day window ending at "today" (server's date).
// ---------------------------------------------------------------------------

import type { BleDevice, PatrolEvent } from "@/types";

export type Shift = "day" | "night";

export interface AttendanceCell {
  date:   string;   // YYYY-MM-DD
  shift:  Shift;
  present: boolean;
  scans: number;    // number of Verified scans that fed this cell
}

export interface GuardRow {
  /** Stable id we use as the row key; comes from the BLE device's id */
  id: string;
  /** Display label for the column header */
  label: string;
  /** Sub-label shown underneath (BLE name + MAC) */
  sublabel: string;
  /** All scans this guard could be matched against, by date+shift */
  cells: Map<string, AttendanceCell>;  // key = `${date}|${shift}`
  totals: { presentDay: number; presentNight: number; absentDay: number; absentNight: number };
}

/** Format a JS Date as YYYY-MM-DD using LOCAL time (not UTC). */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtract one day in local time. */
function prevDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return localDateStr(dt);
}

/**
 * Given a scan timestamp, decide which (calendar-date, shift) bucket it belongs to.
 * - 06:00..17:59 -> (that date, day)
 * - 18:00..23:59 -> (that date, night)
 * - 00:00..05:59 -> (PREVIOUS date, night)   ← night spans midnight
 */
export function bucketForTimestamp(iso: string): { date: string; shift: Shift } {
  const dt = new Date(iso);
  const hour = dt.getHours();
  if (hour >= 6 && hour < 18) {
    return { date: localDateStr(dt), shift: "day" };
  }
  if (hour >= 18) {
    return { date: localDateStr(dt), shift: "night" };
  }
  // hours 0..5 belong to the previous calendar date's night shift
  return { date: prevDay(localDateStr(dt)), shift: "night" };
}

/**
 * Return the array of `windowDays` calendar dates ending today (inclusive),
 * oldest first. Uses local time so the last entry is the operator's "today".
 */
export function buildDateAxis(windowDays = 30): string[] {
  const today = new Date();
  const out: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(localDateStr(d));
  }
  return out;
}

/**
 * Build the attendance grid from raw inputs.
 *
 * @param bleDevices  registered BLE tags
 * @param events      patrol events from the server
 * @param windowDays  rolling window length (default 30)
 */
export function buildAttendance(
  bleDevices: BleDevice[],
  events: PatrolEvent[],
  windowDays = 30
): { dates: string[]; guards: GuardRow[] } {
  const dates = buildDateAxis(windowDays);
  const dateSet = new Set(dates);

  // Map MAC (lowercased) -> BLE device, so we can match scans quickly.
  const macToDevice = new Map<string, BleDevice>();
  for (const d of bleDevices) {
    macToDevice.set(d.mac_address.toLowerCase(), d);
  }

  // Initialize a row per registered BLE device.
  const guards: GuardRow[] = bleDevices.map((d) => ({
    id: d.id,
    label: d.guard_name ?? d.ble_name,
    sublabel: d.guard_name ? `${d.ble_name} · ${d.mac_address}` : d.mac_address,
    cells: new Map(),
    totals: { presentDay: 0, presentNight: 0, absentDay: 0, absentNight: 0 },
  }));
  const idToRow = new Map(guards.map((g) => [g.id, g]));

  // Walk Verified events, drop them into the matching (date, shift) cell.
  for (const ev of events) {
    if (ev.status !== "Verified") continue;
    if (!ev.bluetoothMac || ev.bluetoothMac === "n/a") continue;

    const dev = macToDevice.get(ev.bluetoothMac.toLowerCase());
    if (!dev) continue;

    const { date, shift } = bucketForTimestamp(ev.receivedAt);
    if (!dateSet.has(date)) continue;

    const row = idToRow.get(dev.id);
    if (!row) continue;

    const key = `${date}|${shift}`;
    const cell = row.cells.get(key);
    if (cell) {
      cell.scans += 1;
    } else {
      row.cells.set(key, { date, shift, present: true, scans: 1 });
    }
  }

  // Fill in Absent cells and compute totals.
  for (const row of guards) {
    for (const date of dates) {
      for (const shift of ["day", "night"] as const) {
        const key = `${date}|${shift}`;
        const cell = row.cells.get(key);
        if (cell) {
          if (shift === "day") row.totals.presentDay += 1;
          else                 row.totals.presentNight += 1;
        } else {
          row.cells.set(key, { date, shift, present: false, scans: 0 });
          if (shift === "day") row.totals.absentDay += 1;
          else                 row.totals.absentNight += 1;
        }
      }
    }
  }

  return { dates, guards };
}
