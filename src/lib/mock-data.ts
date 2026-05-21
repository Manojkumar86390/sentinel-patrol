// Seed data used everywhere until the PHP/Flask backend is wired up.
// Keep this file the single source of truth so the UI behaves consistently.

import type { Device, Guard, PatrolLog, DashboardStats } from "@/types";

export const MOCK_STATS: DashboardStats = {
  total_guards: 24,
  active_patrols: 11,
  online_devices: 8,
  missed_checkpoints_today: 3,
};

export const MOCK_GUARDS: Guard[] = [
  { id: "1", guard_code: "GRD-001", name: "Rajesh Kumar",  shift: "night",   contact: "+91 98765 43210", status: "on-duty" },
  { id: "2", guard_code: "GRD-002", name: "Anitha Reddy",  shift: "morning", contact: "+91 98765 43211", status: "on-duty" },
  { id: "3", guard_code: "GRD-003", name: "Suresh Babu",   shift: "evening", contact: "+91 98765 43212", status: "off-duty" },
  { id: "4", guard_code: "GRD-004", name: "Lakshmi Devi",  shift: "night",   contact: "+91 98765 43213", status: "on-duty" },
  { id: "5", guard_code: "GRD-005", name: "Vinod Sharma",  shift: "morning", contact: "+91 98765 43214", status: "on-duty" },
];

export const MOCK_DEVICES: Device[] = [
  { id: "1", device_id: "ESP-001", mac_address: "A4:CF:12:3B:7D:01", checkpoint_name: "Main Gate A",      location: "North Entry",      status: "online",  last_heartbeat: new Date(Date.now() - 12_000).toISOString() },
  { id: "2", device_id: "ESP-002", mac_address: "A4:CF:12:3B:7D:02", checkpoint_name: "Server Room",       location: "Block B - 2F",     status: "online",  last_heartbeat: new Date(Date.now() - 3_000).toISOString() },
  { id: "3", device_id: "ESP-003", mac_address: "A4:CF:12:3B:7D:03", checkpoint_name: "Parking Basement",  location: "Block C - B1",     status: "online",  last_heartbeat: new Date(Date.now() - 24_000).toISOString() },
  { id: "4", device_id: "ESP-004", mac_address: "A4:CF:12:3B:7D:04", checkpoint_name: "Rooftop Access",    location: "Block A - 5F",     status: "offline", last_heartbeat: new Date(Date.now() - 7 * 60_000).toISOString() },
  { id: "5", device_id: "ESP-005", mac_address: "A4:CF:12:3B:7D:05", checkpoint_name: "Emergency Exit",    location: "South Wing",       status: "online",  last_heartbeat: new Date(Date.now() - 8_000).toISOString() },
  { id: "6", device_id: "ESP-006", mac_address: "A4:CF:12:3B:7D:06", checkpoint_name: "Reception Lobby",   location: "Ground Floor",     status: "online",  last_heartbeat: new Date(Date.now() - 15_000).toISOString() },
  { id: "7", device_id: "ESP-007", mac_address: "A4:CF:12:3B:7D:07", checkpoint_name: "Loading Bay",       location: "East Side",        status: "online",  last_heartbeat: new Date(Date.now() - 31_000).toISOString() },
  { id: "8", device_id: "ESP-008", mac_address: "A4:CF:12:3B:7D:08", checkpoint_name: "Perimeter Fence",   location: "West Boundary",    status: "online",  last_heartbeat: new Date(Date.now() - 19_000).toISOString() },
];

/**
 * Lat/lng coordinates spread around Kurnool, AP for each ESP32.
 * Used only by the map view on /live.
 */
export const MOCK_DEVICE_COORDS: Record<string, { lat: number; lng: number }> = {
  "ESP-001": { lat: 15.8281, lng: 78.0422 },
  "ESP-002": { lat: 15.8305, lng: 78.0440 },
  "ESP-003": { lat: 15.8265, lng: 78.0398 },
  "ESP-004": { lat: 15.8320, lng: 78.0455 },
  "ESP-005": { lat: 15.8240, lng: 78.0415 },
  "ESP-006": { lat: 15.8290, lng: 78.0470 },
  "ESP-007": { lat: 15.8275, lng: 78.0385 },
  "ESP-008": { lat: 15.8260, lng: 78.0455 },
};

function makeLog(
  i: number,
  guard: (typeof MOCK_GUARDS)[number],
  device: (typeof MOCK_DEVICES)[number],
  offsetMin: number,
  status: PatrolLog["status"]
): PatrolLog {
  const ts = new Date(Date.now() - offsetMin * 60_000);
  return {
    id: String(i),
    guard_id: guard.id,
    guard_name: guard.name,
    guard_code: guard.guard_code,
    device_id: device.device_id,
    checkpoint: device.checkpoint_name,
    scan_time: ts.toISOString(),
    date: ts.toISOString().slice(0, 10),
    status,
    rssi: -55 - Math.floor(Math.random() * 30),
  };
}

export const MOCK_LOGS: PatrolLog[] = [
  makeLog(1,  MOCK_GUARDS[0], MOCK_DEVICES[0], 2,    "verified"),
  makeLog(2,  MOCK_GUARDS[1], MOCK_DEVICES[1], 5,    "verified"),
  makeLog(3,  MOCK_GUARDS[3], MOCK_DEVICES[4], 8,    "verified"),
  makeLog(4,  MOCK_GUARDS[0], MOCK_DEVICES[2], 14,   "late"),
  makeLog(5,  MOCK_GUARDS[4], MOCK_DEVICES[5], 22,   "verified"),
  makeLog(6,  MOCK_GUARDS[1], MOCK_DEVICES[6], 35,   "verified"),
  makeLog(7,  MOCK_GUARDS[3], MOCK_DEVICES[3], 48,   "missed"),
  makeLog(8,  MOCK_GUARDS[0], MOCK_DEVICES[7], 61,   "verified"),
  makeLog(9,  MOCK_GUARDS[2], MOCK_DEVICES[0], 75,   "verified"),
  makeLog(10, MOCK_GUARDS[4], MOCK_DEVICES[2], 92,   "late"),
  makeLog(11, MOCK_GUARDS[1], MOCK_DEVICES[5], 110,  "verified"),
  makeLog(12, MOCK_GUARDS[3], MOCK_DEVICES[4], 130,  "verified"),
  makeLog(13, MOCK_GUARDS[0], MOCK_DEVICES[1], 145,  "missed"),
  makeLog(14, MOCK_GUARDS[2], MOCK_DEVICES[7], 165,  "verified"),
  makeLog(15, MOCK_GUARDS[4], MOCK_DEVICES[0], 180,  "verified"),
];
