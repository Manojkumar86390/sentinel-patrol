import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import type { DashboardStats } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const [events, bleDevices, scanners, alerts] = await Promise.all([
    db.events.all(),
    db.bleDevices.all(),
    db.scanners.all(),
    db.alerts.all(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const onlineScanners = scanners.filter(
    (s) => now - new Date(s.last_heartbeat).getTime() < 2 * 60_000
  ).length;

  const todayEvents = events.filter((e) => e.date === today);
  const verifiedToday = todayEvents.filter((e) => e.status === "Verified");

  // distinct BLE MACs seen today (Verified only)
  const activeToday = new Set(verifiedToday.map((e) => e.bluetoothMac)).size;

  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;

  const stats: DashboardStats = {
    total_ble_devices:        bleDevices.length,
    total_scanners:           scanners.length,
    online_scanners:          onlineScanners,
    active_today:             activeToday,
    missed_checkpoints_today: todayEvents.filter((e) => e.status === "Missed").length,
    verified_today:           verifiedToday.length,
    active_alerts:            activeAlerts,
  };

  return NextResponse.json({ ok: true, stats });
}
