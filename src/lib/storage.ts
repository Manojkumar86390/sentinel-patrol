// ---------------------------------------------------------------------------
// Storage layer — Supabase (PostgreSQL).
//
// This file replaces the old JSON-file storage. The `db` API surface is
// IDENTICAL to before, so every route file in src/app/api/* keeps working
// without changes.
//
// Tables live in your Supabase project, schema defined in supabase-schema.sql.
// Configure via .env.local:
//
//   SUPABASE_URL         = https://abcdefgh.supabase.co
//   SUPABASE_SECRET_KEY  = sb_secret_...
//
// The secret key is the privileged server-side key (formerly "service_role").
// Do NOT expose it to the browser. This file is only imported by /api routes,
// which run on the server — never on the client.
// ---------------------------------------------------------------------------

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  PatrolEvent,
  BleDevice,
  EspScanner,
  AppConfig,
  EmergencyAlert,
  EventStatus,
  DeviceStatus,
  AlertType,
} from "@/types";

// ─── client (lazy) ────────────────────────────────────────────────────────
// Don't initialize at import time — Next.js may import this file during build
// when env vars aren't yet set. Defer until first use, so the error (if any)
// happens at request time, not at build time.

let _supabase: SupabaseClient | null = null;
function client(): SupabaseClient {
  if (_supabase) return _supabase;

  const url = (process.env.SUPABASE_URL ?? "").trim();
  const key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (and in Vercel → Settings → Environment Variables)."
    );
  }

  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

// ─── PatrolEvent ─────────────────────────────────────────────────────────
type DbPatrolEvent = {
  id:            string;
  name:          string;
  bluetooth_mac: string;
  esp_id:        string;
  location:      string;
  date:          string;
  time:          string;
  received_at:   string;
  status:        string;
  guard_name:    string | null;
};

function eventFromDb(r: DbPatrolEvent): PatrolEvent {
  return {
    id:           r.id,
    name:         r.name,
    bluetoothMac: r.bluetooth_mac,
    espId:        r.esp_id,
    location:     r.location,
    date:         r.date,
    time:         r.time,
    receivedAt:   r.received_at,
    status:       r.status as EventStatus,
    guardName:    r.guard_name ?? undefined,
  };
}

function eventToDb(e: PatrolEvent): DbPatrolEvent {
  return {
    id:            e.id,
    name:          e.name,
    bluetooth_mac: e.bluetoothMac,
    esp_id:        e.espId,
    location:      e.location,
    date:          e.date,
    time:          e.time,
    received_at:   e.receivedAt,
    status:        e.status,
    guard_name:    e.guardName ?? null,
  };
}

// ─── BleDevice ───────────────────────────────────────────────────────────
type DbBleDevice = {
  id:          string;
  mac_address: string;
  ble_name:    string;
  guard_name:  string | null;
  notes:       string | null;
  created_at:  string;
};

function bleFromDb(r: DbBleDevice): BleDevice {
  return {
    id:          r.id,
    mac_address: r.mac_address,
    ble_name:    r.ble_name,
    guard_name:  r.guard_name ?? undefined,
    notes:       r.notes ?? undefined,
    created_at:  r.created_at,
  };
}

function bleToDb(d: BleDevice): DbBleDevice {
  return {
    id:          d.id,
    mac_address: d.mac_address,
    ble_name:    d.ble_name,
    guard_name:  d.guard_name ?? null,
    notes:       d.notes ?? null,
    created_at:  d.created_at,
  };
}

// ─── EspScanner ──────────────────────────────────────────────────────────
type DbScanner = {
  id:             string;
  esp_id:         string;
  location:       string;
  description:    string | null;
  status:         string;
  last_heartbeat: string;
  created_at:     string;
};

function scannerFromDb(r: DbScanner): EspScanner {
  return {
    id:             r.id,
    esp_id:         r.esp_id,
    location:       r.location,
    description:    r.description ?? undefined,
    status:         r.status as DeviceStatus,
    last_heartbeat: r.last_heartbeat,
    created_at:     r.created_at,
  };
}

function scannerToDb(s: EspScanner): DbScanner {
  return {
    id:             s.id,
    esp_id:         s.esp_id,
    location:       s.location,
    description:    s.description ?? null,
    status:         s.status,
    last_heartbeat: s.last_heartbeat,
    created_at:     s.created_at,
  };
}

// ─── EmergencyAlert ──────────────────────────────────────────────────────
type DbAlert = {
  id:                string;
  type:              string;
  esp_id:            string;
  location:          string;
  date:              string;
  time:              string;
  triggered_at:      string;
  acknowledged:      boolean;
  acknowledged_at:   string | null;
  acknowledged_by:   string | null;
  notified_at:       string | null;
  notified:          boolean;
  notify_error:      string | null;
  notify_recipients: unknown;   // jsonb
};

function alertFromDb(r: DbAlert): EmergencyAlert {
  return {
    id:               r.id,
    type:             r.type as AlertType,
    espId:            r.esp_id,
    location:         r.location,
    date:             r.date,
    time:             r.time,
    triggeredAt:      r.triggered_at,
    acknowledged:     r.acknowledged,
    acknowledgedAt:   r.acknowledged_at ?? undefined,
    acknowledgedBy:   r.acknowledged_by ?? undefined,
    notifiedAt:       r.notified_at ?? undefined,
    notified:         r.notified,
    notifyError:      r.notify_error ?? undefined,
    notifyRecipients: (r.notify_recipients as EmergencyAlert["notifyRecipients"]) ?? undefined,
  };
}

function alertToDb(a: EmergencyAlert): DbAlert {
  return {
    id:                a.id,
    type:              a.type,
    esp_id:            a.espId,
    location:          a.location,
    date:              a.date,
    time:              a.time,
    triggered_at:      a.triggeredAt,
    acknowledged:      a.acknowledged,
    acknowledged_at:   a.acknowledgedAt ?? null,
    acknowledged_by:   a.acknowledgedBy ?? null,
    notified_at:       a.notifiedAt ?? null,
    notified:          a.notified,
    notify_error:      a.notifyError ?? null,
    notify_recipients: a.notifyRecipients ?? null,
  };
}

// ─── AppConfig ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: AppConfig = {
  missed_tolerance_min: 10,
  heartbeat_interval_s: 30,
  refresh_interval_s:   5,
  rssi_threshold:       -70,
  session_timeout_min:  30,
};

// ─── helper: bulk replace via delete-all + insert-all ───────────────────
// Used by save(). All current callers pass small arrays (<200 rows) so
// this is fine even on the free Supabase tier.
async function replaceAll<T extends { id: string }>(
  table: string,
  rows: T[]
): Promise<void> {
  const sb = client();
  // Delete all existing rows. Use "not equals to a synthetic value" so we
  // hit every row regardless of id format.
  {
    const { error } = await sb.from(table).delete().neq("id", "__no_such_row__");
    if (error) throw new Error(`storage.${table}.delete: ${error.message}`);
  }
  if (rows.length === 0) return;
  const { error } = await sb.from(table).insert(rows);
  if (error) throw new Error(`storage.${table}.insert: ${error.message}`);
}

// ─── the db API surface ──────────────────────────────────────────────────
export const db = {
  events: {
    /** Most-recent first. Capped at 5000 for safety. */
    all: async (): Promise<PatrolEvent[]> => {
      const { data, error } = await client()
        .from("patrol_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(5000);
      if (error) throw new Error(`storage.events.all: ${error.message}`);
      return (data as DbPatrolEvent[] | null ?? []).map(eventFromDb);
    },

    /** Replace every row. Only the route's "clear all events" feature calls this. */
    save: async (rows: PatrolEvent[]): Promise<void> => {
      await replaceAll("patrol_events", rows.map(eventToDb));
    },

    /** Append a single event. Fast path — no read-modify-write. */
    push: async (event: PatrolEvent): Promise<PatrolEvent> => {
      const { error } = await client().from("patrol_events").insert(eventToDb(event));
      if (error) throw new Error(`storage.events.push: ${error.message}`);
      return event;
    },
  },

  bleDevices: {
    all: async (): Promise<BleDevice[]> => {
      const { data, error } = await client()
        .from("ble_devices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`storage.bleDevices.all: ${error.message}`);
      return (data as DbBleDevice[] | null ?? []).map(bleFromDb);
    },
    save: async (rows: BleDevice[]): Promise<void> => {
      await replaceAll("ble_devices", rows.map(bleToDb));
    },
  },

  scanners: {
    all: async (): Promise<EspScanner[]> => {
      const { data, error } = await client()
        .from("esp32_scanners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(`storage.scanners.all: ${error.message}`);
      return (data as DbScanner[] | null ?? []).map(scannerFromDb);
    },
    save: async (rows: EspScanner[]): Promise<void> => {
      await replaceAll("esp32_scanners", rows.map(scannerToDb));
    },
  },

  alerts: {
    all: async (): Promise<EmergencyAlert[]> => {
      const { data, error } = await client()
        .from("emergency_alerts")
        .select("*")
        .order("triggered_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(`storage.alerts.all: ${error.message}`);
      return (data as DbAlert[] | null ?? []).map(alertFromDb);
    },
    save: async (rows: EmergencyAlert[]): Promise<void> => {
      await replaceAll("emergency_alerts", rows.map(alertToDb));
    },
    push: async (alert: EmergencyAlert): Promise<EmergencyAlert> => {
      const { error } = await client().from("emergency_alerts").insert(alertToDb(alert));
      if (error) throw new Error(`storage.alerts.push: ${error.message}`);
      return alert;
    },
  },

  config: {
    get: async (): Promise<AppConfig> => {
      const { data, error } = await client()
        .from("app_config")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw new Error(`storage.config.get: ${error.message}`);
      if (!data) return DEFAULT_CONFIG;
      // Pull only the fields we care about; fall back to defaults for anything missing.
      return {
        missed_tolerance_min: data.missed_tolerance_min ?? DEFAULT_CONFIG.missed_tolerance_min,
        heartbeat_interval_s: data.heartbeat_interval_s ?? DEFAULT_CONFIG.heartbeat_interval_s,
        refresh_interval_s:   data.refresh_interval_s   ?? DEFAULT_CONFIG.refresh_interval_s,
        rssi_threshold:       data.rssi_threshold       ?? DEFAULT_CONFIG.rssi_threshold,
        session_timeout_min:  data.session_timeout_min  ?? DEFAULT_CONFIG.session_timeout_min,
      };
    },
    save: async (cfg: AppConfig): Promise<void> => {
      const { error } = await client()
        .from("app_config")
        .upsert({ id: 1, ...cfg, updated_at: new Date().toISOString() });
      if (error) throw new Error(`storage.config.save: ${error.message}`);
    },
  },
};
