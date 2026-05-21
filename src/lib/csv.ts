import type { PatrolEvent } from "@/types";

function csvField(v: string | number | undefined): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build a CSV string with a UTF-8 BOM so Excel auto-detects encoding.
 */
export function buildPatrolCsv(events: PatrolEvent[]): string {
  const header = [
    "ID",
    "Date",
    "Time",
    "Guard Name",
    "Tag (BLE Name)",
    "Bluetooth MAC",
    "Scanner (ESP ID)",
    "Location",
    "Status",
    "Received At",
  ].join(",");

  const rows = events.map((e) =>
    [
      csvField(e.id),
      csvField(e.date),
      csvField(e.time),
      csvField(e.guardName ?? ""),
      csvField(e.name),
      csvField(e.bluetoothMac),
      csvField(e.espId),
      csvField(e.location),
      csvField(e.status),
      csvField(e.receivedAt),
    ].join(",")
  );

  return "\uFEFF" + [header, ...rows].join("\r\n");
}

export function filterDaily(events: PatrolEvent[]): PatrolEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return events.filter((e) => e.date === today);
}

export function filterWeekly(events: PatrolEvent[]): PatrolEvent[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return events.filter((e) => new Date(e.receivedAt).getTime() >= cutoff);
}
