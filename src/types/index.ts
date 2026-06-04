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
  photo_url?: string;    // public URL of the guard photo (Supabase Storage)
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
 * A registered Emergency Switch (Product 2).
 *
 * Physically: an ESP32 with 4 panic buttons, kept at the security guard's
 * desk. Each switch has a unique switch_id and a free-form location string
 * (NOT tied to the campus map pins — could be "Security Desk - Main Gate",
 * "Hostel Office", etc.).
 *
 * Coordinates are REQUIRED — they're used to plot the switch on the alerts
 * map so emergencies are visualized at the right spot on campus.
 *
 * Heartbeats every 30s. Online if heartbeat is recent; offline otherwise.
 */
export interface EmergencySwitch {
  id: string;
  switch_id: string;       // matches SWITCH_ID in the firmware
  location: string;        // free-form, e.g. "Security Desk - Main Gate"
  latitude: number;
  longitude: number;
  description?: string;
  status: DeviceStatus;    // computed from last_heartbeat
  last_heartbeat: string;  // ISO timestamp
  created_at: string;
}

/**
 * An emergency button-press from the ESP32 hardware (Accident / Fire / Bleeding / Fight).
 * Stored in /data/emergency-alerts.json.
 *
 * Either espId OR switchId is set, depending on which product sent the alert:
 *   - switchId: from a dedicated Emergency Switch (Product 2) — preferred
 *   - espId:    from a Scanner that ALSO has buttons (legacy combined hardware)
 */
export interface EmergencyAlert {
  id: string;
  type: AlertType;
  espId?: string;          // legacy combined-hardware path
  switchId?: string;       // new Emergency Switch product path
  location: string;        // resolved from scanner or switch table; "Unknown" if not registered
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

// =============================================================================
// Patrol routes & compliance (added in the routes feature)
// =============================================================================

/**
 * A "looping" route definition. The guard walks the listed checkpoints in
 * order, repeating every `intervalMin` minutes throughout the shift.
 *
 * Example: ["ESP32-SCANNER-01", "ESP32-SCANNER-02"] with intervalMin=30 means
 * every 30 minutes the guard should pass both scanners (one then the other).
 */
export interface LoopingRouteConfig {
  intervalMin: number;        // minutes between full loops
  checkpoints: string[];      // ordered list of esp_id values
}

/**
 * A "fixed" route definition. Each checkpoint has a specific time-of-day
 * the guard must reach it (HH:MM, 24h).
 */
export interface FixedRouteConfig {
  schedule: Array<{
    time:  string;            // "HH:MM" (24h)
    espId: string;            // matches esp32_scanners.esp_id
  }>;
}

export type RouteType = "looping" | "fixed";

export interface PatrolRoute {
  id: string;
  name: string;
  description?: string;
  route_type: RouteType;
  late_tolerance_min: number;
  shift_start?: string;       // "HH:MM" 24h, optional. If absent, route is 24/7.
  shift_end?: string;         // "HH:MM" 24h, optional. May wrap past midnight.
  config: LoopingRouteConfig | FixedRouteConfig;
  active: boolean;
  created_at: string;
}

export interface RouteAssignment {
  id: string;
  route_id: string;
  ble_mac: string;             // uppercased MAC
  days_of_week: string;        // 7 chars of 0/1, Mon-first. "1111111" = every day.
  created_at: string;
}

/** Status of one expected checkpoint in today's compliance view. */
export type CheckpointStatus = "completed" | "missed" | "late" | "upcoming";

export interface ComplianceSlot {
  expectedTime: string;        // "HH:MM"
  espId:        string;
  location:     string;
  status:       CheckpointStatus;
  actualTime?:  string;        // "HH:MM:SS" if completed/late
  delayMin?:    number;        // minutes after expectedTime (negative = early)
}

/** Per-guard daily compliance summary. */
export interface ComplianceSummary {
  bleMac:        string;
  guardName?:    string;
  bleName?:      string;
  routeId:       string;
  routeName:     string;
  totalExpected: number;       // expected checkpoints so far (up to "now")
  completed:     number;       // completed on time OR early
  late:          number;
  missed:        number;
  upcoming:      number;       // expected later today
  compliancePct: number;       // completed / (totalExpected - upcoming), 0-100
  slots:         ComplianceSlot[];
}
