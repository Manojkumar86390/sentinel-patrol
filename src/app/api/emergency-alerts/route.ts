// ---------------------------------------------------------------------------
// /api/emergency-alerts
//   GET    – list alerts (newest first). Auth required.
//            ?unack=1 returns only unacknowledged alerts.
//   POST   – ESP32 hardware POSTs an emergency. No auth required.
//   DELETE – wipe history. Auth required.
//
// Payload from ESP32:
//   { "type": "fire" | "accident" | "bleeding" | "fight",
//     "espId": "ESP32-SCANNER-01" }
//
// The server resolves the location via the registered scanners table
// (same as patrol-events). If the espId isn't registered, location is
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

export async function POST(req: Request) {
  // Optional shared secret check — same DEVICE_TOKEN used by patrol-events.
  const deviceToken = req.headers.get("x-device-token");
  if (process.env.DEVICE_TOKEN && deviceToken !== process.env.DEVICE_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bad device token" }, { status: 401 });
  }

  let body: { type?: string; espId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const type  = String(body.type ?? "").toLowerCase() as AlertType;
  const espId = String(body.espId ?? "ESP32-UNKNOWN").trim();

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { ok: false, error: `type must be one of: ${[...VALID_TYPES].join(", ")}` },
      { status: 400 }
    );
  }

  // Resolve scanner location
  const scanners = await db.scanners.all();
  const scanner  = scanners.find((s) => s.esp_id === espId);
  const location = scanner?.location ?? "Unknown";

  const now = new Date();
  const alert: EmergencyAlert = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    espId,
    location,
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
    triggeredAt: now.toISOString(),
    acknowledged: false,
    notified: false,
  };

  // Build a rich Telegram message (HTML formatting). Server-side strings, but
  // escape defensively in case location/espId ever come from user input.
  const tgMessage =
    `${TYPE_EMOJI[type]} <b>${TYPE_LABEL[type]} ALERT</b>\n` +
    `\n` +
    `📍 <b>Location:</b> ${escapeHtml(location)}\n` +
    `📟 <b>Scanner:</b> <code>${escapeHtml(espId)}</code>\n` +
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
