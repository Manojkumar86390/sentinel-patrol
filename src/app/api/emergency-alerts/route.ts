// ---------------------------------------------------------------------------
// /api/emergency-alerts
//   GET    – list alerts (newest first). Auth required.
//            ?unack=1 returns only unacknowledged alerts.
//   POST   – Scanner hardware POSTs an emergency. No auth required.
//   DELETE – wipe history. Auth required.
//
// Payload from Scanner:
//   { "type": "fire" | "accident" | "bleeding" | "fight",
//     "scannerId": "SCANNER-01" }
//
// The server resolves the location via the registered scanners table
// (same as patrol-events). If the scannerId isn't registered, location is
// stored as "Unknown" and notifications still go out (safer for
// real emergencies).
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { db } from "@/lib/storage";
import { currentUser } from "@/lib/auth";
import { sendAlertNotification, escapeHtml } from "@/lib/notify";
import type { AlertType, EmergencyAlert } from "@/types";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<AlertType>(["accident", "fire", "bleeding", "fight"]);

const TYPE_EMOJI: Record<AlertType, string> = {
  accident: "🚨",
  fire:     "🔥",
  bleeding: "🩸",
  fight:    "⚔️",
};

const TYPE_LABEL: Record<AlertType, string> = {
  accident: "ACCIDENT",
  fire:     "FIRE",
  bleeding: "BLEEDING",
  fight:    "FIGHT",
};

// ---------- GET ------------------------------------------------------------

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const unackOnly = url.searchParams.get("unack") === "1";

  let items = await db.alerts.all();
  if (unackOnly) items = items.filter((a) => !a.acknowledged);

  return NextResponse.json({ ok: true, total: items.length, items });
}

// ---------- POST (ESP32 -> server) -----------------------------------------
//
// Payload variants we accept:
//
//   Emergency Switch product (preferred, new):
//     { type: "fire"|"accident"|"bleeding"|"fight", switchId: "SWITCH-01" }
//     -> creates an alert, location resolved from emergency_switches table
//
//   Heartbeat (every 30s from Emergency Switch firmware):
//     { type: "heartbeat", switchId: "SWITCH-01" }
//     -> updates last_heartbeat in emergency_switches; NO alert created
//
//   Scanner product (legacy, combined hardware):
//     { type: "fire"|..., scannerId: "SCANNER-01" }
//     -> creates an alert, location resolved from esp32_scanners table

export async function POST(req: Request) {
  // Optional shared secret check — same DEVICE_TOKEN used by patrol-events.
  const deviceToken = req.headers.get("x-device-token");
  if (process.env.DEVICE_TOKEN && deviceToken !== process.env.DEVICE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bad device token" }, { status: 401 });
  }

  let body: { type?: string; scannerId?: string; switchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rawType  = String(body.type ?? "").toLowerCase();
  const scannerId    = (body.scannerId    ?? "").trim() || undefined;
  const switchId = (body.switchId ?? "").trim() || undefined;

  if (!scannerId && !switchId) {
    return NextResponse.json(
      { ok: false, error: "Either scannerId or switchId must be provided" },
      { status: 400 }
    );
  }

  // ─── HEARTBEAT path ─────────────────────────────────────────────────────
  // The Emergency Switch firmware pings every 30s with type="heartbeat" so
  // the dashboard can show it as online/offline. We just bump the timestamp
  // and bail — no alert is created.
  if (rawType === "heartbeat") {
    if (switchId) await db.switches.touchHeartbeat(switchId);
    return NextResponse.json({ ok: true, heartbeat: true });
  }

  // ─── ALERT path ─────────────────────────────────────────────────────────
  const type = rawType as AlertType;
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { ok: false, error: `type must be one of: ${[...VALID_TYPES].join(", ")} (or "heartbeat")` },
      { status: 400 }
    );
  }

  // Resolve location: prefer switch (new product), fall back to scanner.
  let location = "Unknown";
  if (switchId) {
    const switches = await db.switches.all();
    const sw = switches.find((s) => s.switch_id === switchId);
    if (sw) location = sw.location;
    // Always touch the heartbeat too — pressing a button counts as "alive".
    await db.switches.touchHeartbeat(switchId);
  } else if (scannerId) {
    const scanners = await db.scanners.all();
    const scanner  = scanners.find((s) => s.scanner_id === scannerId);
    if (scanner) location = scanner.location;
  }

  const now = new Date();
  const alert: EmergencyAlert = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    scannerId,
    switchId,
    location,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
    triggeredAt: now.toISOString(),
    acknowledged: false,
    notified: false,
  };

  // Telegram message — source line shows whichever ID we have.
  const sourceLine = switchId
    ? `📟 <b>Switch:</b> <code>${escapeHtml(switchId)}</code>`
    : `📟 <b>Scanner:</b> <code>${escapeHtml(scannerId ?? "Unknown")}</code>`;

  const tgMessage =
    `${TYPE_EMOJI[type]} <b>${TYPE_LABEL[type]} ALERT</b>\n` +
    `\n` +
    `📍 <b>Location:</b> ${escapeHtml(location)}\n` +
    `${sourceLine}\n` +
    `🕒 <b>Time:</b> <code>${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</code>\n` +
    `\n` +
    `<i>Acknowledge in the dashboard once handled.</i>`;

  const notify = await sendAlertNotification(tgMessage);
  alert.notified       = notify.ok && !notify.skipped;
  alert.notifiedAt     = new Date().toISOString();
  alert.notifyRecipients = notify.recipients;
  if (!notify.ok && !notify.skipped) {
    const firstErr = notify.recipients.find((r) => !r.ok)?.error;
    alert.notifyError = firstErr ?? "All Telegram recipients failed";
  }

  await db.alerts.push(alert);

  return NextResponse.json({ ok: true, alert });
}

// ---------- DELETE ---------------------------------------------------------

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  await db.alerts.save([]);
  return NextResponse.json({ ok: true });
}
