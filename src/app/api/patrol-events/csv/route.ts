// ---------------------------------------------------------------------------
// /api/patrol-events/csv?period=daily|weekly|all
//   Streams a CSV of patrol events for the requested window.
//   Excel opens it directly thanks to the UTF-8 BOM in buildPatrolCsv().
// ---------------------------------------------------------------------------

import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { buildPatrolCsv, filterDaily, filterWeekly } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url    = new URL(req.url);
  const period = url.searchParams.get("period") ?? "daily";

  let events = await db.events.all();
  if (period === "daily")  events = filterDaily(events);
  if (period === "weekly") events = filterWeekly(events);
  // period === "all" → no filter

  const today = new Date().toISOString().slice(0, 10);
  const filename = `patrol-${period}-${today}.csv`;
  const body = buildPatrolCsv(events);

  return new Response(body, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control":       "no-store",
    },
  });
}
