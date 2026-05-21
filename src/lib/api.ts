// ---------------------------------------------------------------------------
// Centralized API client for the patrol monitoring backend.
//
// All network calls live here so that swapping the base URL, adding auth
// headers, or migrating from REST to WebSockets is a one-file change.
//
// Set NEXT_PUBLIC_API_BASE_URL in .env.local to point at your PHP/Flask
// backend (e.g. http://192.168.1.50/api).
// ---------------------------------------------------------------------------

import type {
  DashboardStats,
  Device,
  Guard,
  PatrolLog,
  PatrolScanPayload,
} from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

// ---------- low-level helper -----------------------------------------------

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------- patrol endpoints -----------------------------------------------

/** ESP32 -> server. Records a checkpoint scan. */
export const savePatrol = (payload: PatrolScanPayload) =>
  request<{ ok: true; log_id: string }>("/save_patrol", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/** Paginated patrol logs feed for the Logs page. */
export const getLogs = (params: {
  guard_id?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: number;
} = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  ).toString();
  return request<{ items: PatrolLog[]; total: number }>(
    `/get_logs${qs ? `?${qs}` : ""}`
  );
};

// ---------- device endpoints -----------------------------------------------

export const getDeviceStatus = () =>
  request<Device[]>("/device_status");

export const addDevice = (device: Omit<Device, "id" | "last_heartbeat">) =>
  request<Device>("/add_device", {
    method: "POST",
    body: JSON.stringify(device),
  });

// ---------- dashboard / reports --------------------------------------------

export const getDashboardStats = () =>
  request<DashboardStats>("/dashboard_stats");

export const getDailyReport = (date: string) =>
  request<PatrolLog[]>(`/reports/daily?date=${date}`);

export const getWeeklyReport = (start: string) =>
  request<PatrolLog[]>(`/reports/weekly?start=${start}`);

// ---------- guards / auth --------------------------------------------------

export const addGuard = (guard: Omit<Guard, "id">) =>
  request<Guard>("/add_guard", {
    method: "POST",
    body: JSON.stringify(guard),
  });

export const login = (username: string, password: string) =>
  request<{ token: string; user: { id: string; username: string } }>("/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
