// ---------------------------------------------------------------------------
// Patrol-route compliance computation.
//
// Pure function: given today's routes, the Bluetooth/route assignments, and the
// recent patrol events, return a per-guard ComplianceSummary listing every
// expected checkpoint slot (so far + upcoming) and whether the guard hit it.
//
// Time semantics:
//   • "Today" means the local-time day in IST (the system runs in India).
//   • Tolerance is SYMMETRIC: scans within ±tolerance of the expected time
//     count as on-time. So with tolerance=1, a slot at 11:00 accepts any
//     scan between 10:59 and 11:01 as on-time.
//   • Beyond +tolerance up to +2*tolerance is "late".
//   • Scans more than `tolerance` minutes EARLIER than the slot don't match
//     this slot at all (they probably belong to a different slot or are
//     unrelated patrols).
//   • Once we're past `expectedTime + 2 * tolerance`, an unscanned slot is
//     "missed". Earlier than that, it's "upcoming".
//
// This intentionally lives apart from any database access so it's trivially
// testable and reasoned about.
// ---------------------------------------------------------------------------

import type {
  ComplianceSlot,
  ComplianceSummary,
  Scanner,
  PatrolEvent,
  PatrolRoute,
  RouteAssignment,
  Tag,
  LoopingRouteConfig,
  FixedRouteConfig,
} from "@/types";

// IST is UTC+5:30. Server time may differ; we always work in IST for the
// "today" anchor + HH:MM math.
const IST_OFFSET_MIN = 5 * 60 + 30;

/** Returns { dateStr: "YYYY-MM-DD", minutesSinceMidnight: number } in IST. */
function nowInIst(now: Date = new Date()): {
  dateStr: string;
  minutesSinceMidnight: number;
  dayOfWeekMonFirst: number;     // 0 = Mon, ..., 6 = Sun
} {
  const utcMs = now.getTime();
  const istMs = utcMs + IST_OFFSET_MIN * 60_000;
  const ist   = new Date(istMs);   // treated as UTC, but values match IST
  const y     = ist.getUTCFullYear();
  const m     = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d     = String(ist.getUTCDate()).padStart(2, "0");
  const hrs   = ist.getUTCHours();
  const mins  = ist.getUTCMinutes();
  // Date#getUTCDay returns 0=Sun..6=Sat. Convert to 0=Mon..6=Sun.
  const dow0Sun = ist.getUTCDay();
  const dow     = (dow0Sun + 6) % 7;
  return {
    dateStr: `${y}-${m}-${d}`,
    minutesSinceMidnight: hrs * 60 + mins,
    dayOfWeekMonFirst: dow,
  };
}

/** Parse "HH:MM" -> minutes since midnight. Returns null on bad input. */
function parseHHMM(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function formatHHMM(minutes: number): string {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Generate the expected slot list for a route, on a particular date, in IST.
 * The result is an ordered list of { expectedMinute, scannerId }. Each entry
 * represents a checkpoint the guard should have hit.
 */
function expectedSlotsForToday(
  route: PatrolRoute,
  dayMinutes: number,         // length of day, always 24*60 in practice
): Array<{ expectedMinute: number; scannerId: string }> {
  const slots: Array<{ expectedMinute: number; scannerId: string }> = [];

  if (route.route_type === "fixed") {
    const cfg = route.config as FixedRouteConfig;
    for (const item of cfg.schedule) {
      const m = parseHHMM(item.time);
      if (m !== null) slots.push({ expectedMinute: m, scannerId: item.scannerId });
    }
    slots.sort((a, b) => a.expectedMinute - b.expectedMinute);
    return slots;
  }

  // Looping: start at shift_start (or 00:00), generate one slot per checkpoint
  // per interval. Stops at shift_end (or end of day).
  const cfg = route.config as LoopingRouteConfig;
  if (!Array.isArray(cfg.checkpoints) || cfg.checkpoints.length === 0) return slots;
  const interval = Math.max(1, cfg.intervalMin || 30);
  const checkpointDurationMin = Math.max(1, Math.floor(interval / cfg.checkpoints.length));

  const startMin = parseHHMM(route.shift_start ?? null) ?? 0;
  let   endMin   = parseHHMM(route.shift_end   ?? null);
  if (endMin === null) endMin = dayMinutes;
  // Handle shifts that wrap past midnight (e.g. 22:00 -> 06:00). For today's
  // view we just clip to today; the next day's compliance is computed fresh.
  if (endMin <= startMin) endMin += dayMinutes;

  let cursor = startMin;
  while (cursor < endMin) {
    for (const scannerId of cfg.checkpoints) {
      if (cursor >= endMin) break;
      slots.push({ expectedMinute: cursor % dayMinutes, scannerId });
      cursor += checkpointDurationMin;
    }
  }
  return slots;
}

/**
 * For a single slot, find the matching patrol event in `eventsForMac` that
 * comes closest to the expected time. "Matching" = same scannerId AND falls
 * within the allowed window:
 *
 *     [expected - tolerance, expected + 2*tolerance]
 *
 * Symmetric on the early side: scans more than `tolerance` minutes earlier
 * don't count for THIS slot (they may belong to an earlier slot, or be
 * unrelated). Returns the chosen event + its delay (positive = late,
 * negative = early, 0 = exactly on time).
 */
function findMatchingEvent(
  expectedMinute: number,
  scannerId: string,
  toleranceMin: number,
  eventsForMac: Array<{ scannerId: string; minutes: number; iso: string; time: string }>,
): { iso: string; time: string; delay: number } | null {
  const earliestAllowed = expectedMinute - toleranceMin;
  const cutoffLate      = expectedMinute + 2 * toleranceMin;
  let best: typeof eventsForMac[0] | null = null;
  let bestDist = Infinity;

  for (const e of eventsForMac) {
    if (e.scannerId !== scannerId) continue;
    if (e.minutes < earliestAllowed) continue;  // too early — doesn't match this slot
    if (e.minutes > cutoffLate) continue;       // too late even for the "late" bucket
    const dist = Math.abs(e.minutes - expectedMinute);
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  if (!best) return null;
  return { iso: best.iso, time: best.time, delay: best.minutes - expectedMinute };
}

/**
 * Top-level computation. Given everything, produce a ComplianceSummary per
 * (route, tag_mac) pair that's active today.
 */
export function computeCompliance({
  routes,
  assignments,
  events,
  scanners,
  tags,
  now = new Date(),
}: {
  routes:      PatrolRoute[];
  assignments: RouteAssignment[];
  events:      PatrolEvent[];
  scanners:    Scanner[];
  tags:  Tag[];
  now?:        Date;
}): ComplianceSummary[] {
  const t = nowInIst(now);
  const today = t.dateStr;
  const currentMin = t.minutesSinceMidnight;
  const todayDow = t.dayOfWeekMonFirst;
  const dayMinutes = 24 * 60;

  // Fast lookups
  const locByEsp = new Map(scanners.map((s) => [s.scanner_id, s.location] as const));
  const bleByMac = new Map(
    tags.map((d) => [d.mac_address.toUpperCase(), d] as const)
  );

  // Pre-filter events to TODAY (IST) and compute their minutes-since-midnight.
  const todayEvents = events
    .filter((e) => e.date === today)
    .map((e) => {
      // e.time is "HH:MM:SS" — parse into minutes
      const parts = e.time.split(":").map(Number);
      const m = (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
      return {
        macUpper: e.bluetoothMac.toUpperCase(),
        scannerId:    e.scannerId,
        minutes:  m,
        iso:      e.receivedAt,
        time:     e.time,
      };
    });

  const out: ComplianceSummary[] = [];

  for (const route of routes) {
    if (!route.active) continue;
    const slotsAll = expectedSlotsForToday(route, dayMinutes);
    if (slotsAll.length === 0) continue;

    // Active assignments for this route, today (matching day-of-week mask).
    const dayAssignments = assignments.filter(
      (a) => a.route_id === route.id && (a.days_of_week[todayDow] ?? "1") === "1"
    );

    for (const a of dayAssignments) {
      const macUpper = a.tag_mac.toUpperCase();
      const eventsForThisGuard = todayEvents.filter((e) => e.macUpper === macUpper);

      let completed = 0, late = 0, missed = 0, upcoming = 0;

      const slots: ComplianceSlot[] = slotsAll.map(({ expectedMinute, scannerId }) => {
        const tolerance = route.late_tolerance_min;
        const match = findMatchingEvent(expectedMinute, scannerId, tolerance, eventsForThisGuard);
        const location = locByEsp.get(scannerId) ?? scannerId;

        if (match) {
          // On-time when scan is within ±tolerance. Late when after +tolerance.
          // (The matching window already rejected anything more than -tolerance
          // early, so a negative `delay` here is guaranteed to be in [-tol, 0].)
          const isOnTime = Math.abs(match.delay) <= tolerance;
          if (isOnTime) completed++; else late++;
          return {
            expectedTime: formatHHMM(expectedMinute),
            scannerId,
            location,
            status: isOnTime ? "completed" : "late",
            actualTime: match.time,
            delayMin:   match.delay,
          };
        }

        // No match yet. Are we past the window?
        const cutoffMissed = expectedMinute + 2 * tolerance;
        if (currentMin > cutoffMissed) {
          missed++;
          return {
            expectedTime: formatHHMM(expectedMinute),
            scannerId, location, status: "missed",
          };
        }
        upcoming++;
        return {
          expectedTime: formatHHMM(expectedMinute),
          scannerId, location, status: "upcoming",
        };
      });

      const ble = bleByMac.get(macUpper);
      const expectedSoFar = completed + late + missed;
      const compliancePct = expectedSoFar === 0
        ? 100
        : Math.round((completed / expectedSoFar) * 100);

      out.push({
        tagMac:        macUpper,
        guardName:     ble?.guard_name,
        tagName:       ble?.tag_name,
        routeId:       route.id,
        routeName:     route.name,
        totalExpected: slots.length,
        completed,
        late,
        missed,
        upcoming,
        compliancePct,
        slots,
      });
    }
  }

  // Sort: lowest compliance first so problems surface at the top
  out.sort((a, b) => a.compliancePct - b.compliancePct);
  return out;
}
