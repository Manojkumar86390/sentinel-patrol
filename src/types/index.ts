// ---------------------------------------------------------------------------
// Domain types for the Smart Security Patrol Monitoring System.
//
// Model:
//   - A BLE device (HC-05, GUARD_TAG_01, …) is a roaming tag carried by a
//     guard. It has a MAC and an optional friendly name. It has NO location.
//
//   - An ESP32 scanner is bolted to a wall at a fixed checkpoint. It has an
//     ESP_ID and a location (e.g. "Hostel Gate"). The location belongs to
//     the scanner because the scanner is what doesn't move.
//
//   - A PatrolEvent records "this BLE device was seen by this ESP32 scanner
//     at this time". The event's location is whatever the scanner's location
//     was at scan time.
// ---------------------------------------------------------------------------

export type EventStatus  = "Verified" | "Missed" | "Late";
export type DeviceStatus = "online" | "offline";
export type AlertType    = "accident" | "fire" | "bleeding" | "fight";

/** A single BLE scan event. Stored in /data/patrol-events.json. */
export interface PatrolEvent {
  id: string;
  bluetoothMac: string;   // "44:a7:36:85:cb:22" or "n/a"
  name: string;           // BLE-broadcast name, e.g. "HC-05" or "NO_DEVICE"
  guardName?: string;     // optional friendly label from BLE devices table
  espId: string;          // "ESP32-SCANNER-01"
  location: string;       // resolved from the ESP32 scanner's location field
  date: string;           // "YYYY-MM-DD"
  time: string;           // "HH:MM:SS"
  status: EventStatus;
  receivedAt: string;     // ISO timestamp the server recorded the event
  rssi?: number;          // dBm value from BLE scan (negative number). Absent for NO_DEVICE.
}

/**
 * Live-computed guard position for the campus map.
 * Not persisted — recomputed on every /api/guard-positions request from
 * recent patrol events.
 */
export interface GuardPosition {
  mac: string;             // BLE MAC address (the "key")
  name: string;            // "HC-05" or friendly guard name
  guardName?: string;
  lat: number;             // estimated latitude
  lng: number;             // estimated longitude
  accuracyMeters: number;  // ~estimated horizontal error radius
  computedAt: string;      // ISO timestamp
  source: "snap" | "interpolated";  // method used
  sample: Array<{          // raw inputs used (for transparency)
    espId: string;
    rssi: number;
    location: string;
    ageSeconds: number;
  }>;
}

/**
 * A registered BLE tag (HC-05, GUARD_TAG_01, etc.).
 * Stored in /data/ble-devices.json. NO location field — locations belong to
 * the ESP32 scanners.
 */
export interface BleDevice {
  id: string;
  mac_address: string;   // uppercased "AA:BB:CC:DD:EE:FF"
  ble_name: string;      // the name as broadcast over BLE (e.g. "HC-05")
  guard_name?: string;   // optional friendly label ("Rajesh", "Night Guard A")
  notes?: string;
  created_at: string;
}

/**
 * A registered ESP32 scanner.
 * Stored in /data/esp32-scanners.json. The scanner's location is the
 * checkpoint where this device is bolted.
 */
export interface EspScanner {
  id: string;
  esp_id: string;         // matches the ESP_ID in the firmware
  location: string;       // checkpoint name, e.g. "Hostel Gate"
  description?: string;   // optional free-form description
  status: DeviceStatus;   // computed from last_heartbeat
  last_heartbeat: string; // ISO timestamp
  created_at: string;
}

/** Admin-configurable thresholds. */
export interface AppConfig {
  missed_tolerance_min: number;
  heartbeat_interval_s: number;
  refresh_interval_s:   number;
  rssi_threshold:       number;
  session_timeout_min:  number;
}

/**
 * An emergency button-press from the ESP32 hardware (Accident / Fire / Bleeding / Fight).
 * Stored in /data/emergency-alerts.json.
 */
export interface EmergencyAlert {
  id: string;
  type: AlertType;
  espId: string;
  location: string;        // resolved from esp32-scanners table; "Unknown" if not registered
  date: string;            // YYYY-MM-DD
  time: string;            // HH:MM:SS
  triggeredAt: string;     // ISO
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notifiedAt?: string;     // when we tried Telegram
  notified: boolean;       // true if at least one Telegram chat received it
  notifyError?: string;    // human-readable error if Telegram failed
  notifyRecipients?: Array<{ chatId: string; kind: "group" | "individual"; ok: boolean; error?: string }>;
}

/** Dashboard stat-card counts. */
export interface DashboardStats {
  total_ble_devices:        number;
  total_scanners:           number;
  online_scanners:          number;
  active_today:             number;  // distinct BLE devices seen today
  missed_checkpoints_today: number;
  verified_today:           number;
  active_alerts:            number;  // unacknowledged emergency alerts
}
