// ---------------------------------------------------------------------------
// File-based JSON storage. Each table is a single file under /data:
//   patrol-events.json   – scan records
//   ble-devices.json     – registered BLE tags (HC-05, GUARD_TAG_01, …)
//   esp32-scanners.json  – registered ESP32 scanners (location lives here)
//   config.json          – admin-configurable thresholds
//
// Writes go through writeJson() which writes to a temp file then renames —
// power-loss mid-write can't corrupt the on-disk JSON.
// ---------------------------------------------------------------------------

import fs from "fs/promises";
import path from "path";
import type {
  PatrolEvent,
  BleDevice,
  EspScanner,
  AppConfig,
  EmergencyAlert,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  await ensureDir();
  const finalPath = path.join(DATA_DIR, file);
  const tmpPath   = `${finalPath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, finalPath);
}

const DEFAULT_CONFIG: AppConfig = {
  missed_tolerance_min: 10,
  heartbeat_interval_s: 30,
  refresh_interval_s:   5,
  rssi_threshold:       -70,
  session_timeout_min:  30,
};

export const db = {
  events: {
    all:  () => readJson<PatrolEvent[]>("patrol-events.json", []),
    save: (rows: PatrolEvent[]) => writeJson("patrol-events.json", rows),
    push: async (event: PatrolEvent) => {
      const all = await db.events.all();
      all.unshift(event);
      if (all.length > 5000) all.length = 5000;
      await db.events.save(all);
      return event;
    },
  },
  bleDevices: {
    all:  () => readJson<BleDevice[]>("ble-devices.json", []),
    save: (rows: BleDevice[]) => writeJson("ble-devices.json", rows),
  },
  scanners: {
    all:  () => readJson<EspScanner[]>("esp32-scanners.json", []),
    save: (rows: EspScanner[]) => writeJson("esp32-scanners.json", rows),
  },
  alerts: {
    all:  () => readJson<EmergencyAlert[]>("emergency-alerts.json", []),
    save: (rows: EmergencyAlert[]) => writeJson("emergency-alerts.json", rows),
    push: async (alert: EmergencyAlert) => {
      const all = await db.alerts.all();
      all.unshift(alert);
      if (all.length > 2000) all.length = 2000;
      await db.alerts.save(all);
      return alert;
    },
  },
  config: {
    get:  async () => ({ ...DEFAULT_CONFIG, ...(await readJson<Partial<AppConfig>>("config.json", {})) }),
    save: (cfg: AppConfig) => writeJson("config.json", cfg),
  },
};
