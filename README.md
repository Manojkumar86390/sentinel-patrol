# Sentinel — Smart Security Patrol Monitoring System

A full-stack IoT dashboard for tracking guard patrols with BLE wristbands and ESP32 detection nodes.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Spline 3D · JSON-file backend

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Click **Admin Sign-in** and use the default credentials:

| Username | Password |
| -------- | -------- |
| `admin`  | `admin123` |

Change them in `.env.local`.

---

## How everything connects

```
  ┌──────────┐  WiFi  ┌─────────────────┐  reads/writes  ┌──────────────┐
  │  ESP32   │ ─────▶ │  Next.js API    │ ─────────────▶ │  /data/*.json│
  │ + HC-05  │  POST  │  /api/patrol-   │                │  on disk     │
  │ scanner  │        │   events        │                │              │
  └──────────┘        └─────────────────┘                └──────────────┘
                              ▲
                              │ fetch (polled every 5s)
                              │
                       ┌──────┴──────┐
                       │  Dashboard  │
                       │  /dashboard │
                       └─────────────┘
```

- **ESP32** scans for BLE devices and POSTs each detection to `/api/patrol-events`.
- **Server** matches the detected MAC against `data/devices.json` to resolve the checkpoint name and decide Verified / Missed.
- **Frontend** polls `/api/patrol-events` every 5 seconds and updates the UI live.

---

## Project structure

```
src/
├── app/
│   ├── layout.tsx                Root layout (fonts, metadata)
│   ├── globals.css               Tailwind v4 theme + animations
│   ├── page.tsx                  Landing page (hero, features, mockups)
│   ├── login/page.tsx            Real auth → POST /api/login
│   ├── (dashboard)/              Sidebar route group, protected by middleware
│   │   ├── layout.tsx            Sidebar shell
│   │   ├── dashboard/page.tsx    Live stats + recent activity + alerts
│   │   ├── logs/page.tsx         Searchable / filterable / paginated logs
│   │   ├── live/page.tsx         Real-time checkpoint cards
│   │   ├── devices/page.tsx      Register / delete BLE devices
│   │   ├── reports/page.tsx      CSV downloads (daily / weekly / all)
│   │   └── settings/page.tsx     Guards · Devices · System thresholds
│   └── api/                      REST API routes (see below)
│
├── components/
│   ├── ui/                       shadcn-style primitives + Spline + map
│   ├── layout/                   Sidebar, topbar, footer
│   ├── hero/                     Landing hero + mockup illustrations
│   └── dashboard/                Live widgets (stats card, activity table…)
│
├── hooks/
│   └── use-live.ts               Generic polling hook used by every page
│
├── lib/
│   ├── storage.ts                Atomic JSON-file read/write
│   ├── auth.ts                   HMAC-signed session cookie
│   ├── csv.ts                    Excel-friendly CSV builder
│   └── utils.ts                  cn(), formatTimestamp(), timeAgo()
│
├── middleware.ts                 Bounces /dashboard/* → /login if no cookie
└── types/index.ts                Domain types matched to ESP32 payload

data/                             JSON storage (gitignored except .gitkeep)
├── patrol-events.json            Scan history (seeded with 22 real events)
├── devices.json                  Registered BLE devices ↔ checkpoints
├── guards.json                   Registered guards
└── config.json                   Admin-configurable thresholds

esp32/
└── sentinel-patrol-scanner.ino   Arduino firmware (see "ESP32 setup")
```

---

## API endpoints

All endpoints return JSON. All require the session cookie except `POST /api/login`, `POST /api/patrol-events` (used by ESP32), and `POST /api/logout`.

| Method | Path                                | What it does |
| ------ | ----------------------------------- | ------------ |
| POST   | `/api/login`                        | Validate credentials, set cookie |
| POST   | `/api/logout`                       | Clear cookie |
| GET    | `/api/session`                      | Is the current user logged in? |
| GET    | `/api/patrol-events`                | List events (newest first). Query: `limit`, `from`, `to`, `q`, `status` |
| POST   | `/api/patrol-events`                | **ESP32 endpoint** — record a scan |
| DELETE | `/api/patrol-events`                | Wipe all events (admin) |
| GET    | `/api/patrol-events/csv?period=…`   | Download CSV. `period`=`daily`,`weekly`,`all` |
| GET    | `/api/devices`                      | List registered devices |
| POST   | `/api/devices`                      | Register a BLE device |
| PUT    | `/api/devices/:id`                  | Update |
| DELETE | `/api/devices/:id`                  | Remove |
| GET    | `/api/guards`                       | List guards |
| POST   | `/api/guards`                       | Add guard |
| DELETE | `/api/guards/:id`                   | Remove guard |
| GET    | `/api/dashboard-stats`              | Counts for the 4 stat cards |
| GET    | `/api/config`                       | Get admin thresholds |
| PUT    | `/api/config`                       | Update admin thresholds |

---

## ESP32 setup

The firmware lives at `esp32/sentinel-patrol-scanner.ino`.

### Hardware
- One ESP32 board (any dev module) per checkpoint
- One BLE tag (HC-05 or similar) per guard

### Wiring it up
1. **Find your computer's LAN IP**
   - Windows: open Command Prompt, run `ipconfig`, look for "IPv4 Address" (e.g. `192.168.1.50`)
   - Mac / Linux: `ifconfig` or `ip addr`

2. **Edit `sentinel-patrol-scanner.ino`** (top of the file):
   ```cpp
   const char* WIFI_SSID  = "YourWiFiNetwork";
   const char* WIFI_PASS  = "YourWiFiPassword";
   const char* SERVER_URL = "http://192.168.1.50:3000/api/patrol-events";  // YOUR IP
   const char* ESP_ID     = "ESP32-SCANNER-01";   // unique per device
   ```

3. **Install the library** in Arduino IDE:
   - Tools → Manage Libraries → search **ArduinoJson** by Benoit Blanchon → install (v7.x)
   - The WiFi and BluetoothSerial libraries ship with the ESP32 core, no separate install needed.

4. **Pick the right board**: Tools → Board → ESP32 Arduino → ESP32 Dev Module.

5. **Flash and open Serial Monitor at 115200 baud.** You should see:
   ```
   === Sentinel Patrol Scanner ===
   WiFi connected. IP: 192.168.4.21
   Bluetooth started in master mode. Beginning scans…
   --- Scanning for nearby devices ---
   Found 1 device(s).
     → HC-05  [44:a7:36:85:cb:22]
   [ok 200] {"ok":true,"event":{...}}
   ```

6. **Register the BLE tag** on the dashboard: Settings → BLE Devices → enter the MAC (e.g. `44:A7:36:85:CB:22`) and a checkpoint name (e.g. "Hostel"). After this, scans from that tag appear as **Verified** with the checkpoint name. Unregistered scans / no device in range record as **Missed**.

### Make sure the laptop and ESP32 are on the same WiFi
The dashboard runs at `localhost` on your laptop. The ESP32 reaches it via your laptop's LAN IP. Both devices must be on the same network. If your laptop firewall blocks port 3000, allow it once when Windows asks.

---

## Reports & CSV

Open Reports in the sidebar. Three buttons:
- **Daily Report** — today's events
- **Weekly Report** — last 7 days
- **Full Export** — every event in the database

The CSV file opens directly in Excel on Windows (it has a UTF-8 BOM for auto-detection). Columns: ID, Date, Time, Tag Name, Guard ID, Bluetooth MAC, Checkpoint, ESP32 Scanner, Status, Received At.

---

## Configuration (.env.local)

```env
ADMIN_USER=admin                       # change before deploying
ADMIN_PASS=admin123
SESSION_SECRET=replace-me-please       # used to sign the session cookie

# Optional shared secret. If set, ESP32 must send this in the
# `x-device-token` header. Leave blank to allow anonymous POSTs.
DEVICE_TOKEN=

NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

To generate a strong `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `/dashboard` redirects to `/login` | Cookie missing or expired — log in again |
| ESP32 POST returns 401 "Bad device token" | Either set the same `DEVICE_TOKEN` on both sides, or unset it on both |
| ESP32 POST fails: connection refused | Server not running (`npm run dev`), wrong IP, or firewall blocking port 3000 |
| Dashboard shows 0 events even though ESP32 is sending | Check the Next.js terminal — POSTs should log `POST /api/patrol-events 200`. If 500, look at the error |
| Excel opens CSV with garbled characters | We include UTF-8 BOM; ensure you're using a real Excel/LibreOffice, not Notepad |
| "Parsing CSS source code failed" on startup | The `@import` for Google Fonts must come **before** `@import "tailwindcss"` in `globals.css` — already fixed in this repo |
