/*
  ============================================================================
  Sentinel — Patrol Scanner (Product 1 of 2)
  ============================================================================
  This ESP32 is the BLE Scanner — fixed at a checkpoint (Main Gate, ECE Block,
  etc.). It does ONE job: scan continuously for the guard's BLE wristband and
  POST detection events to /api/patrol-events.

  Each detection includes RSSI (signal strength), used by the website for
  live guard tracking on the campus map.

  PAIR THIS WITH: sentinel-emergency-switch.ino (separate product, on its
  own ESP32, with the 4 panic buttons).

  Endpoint
  --------
    POST /api/patrol-events     { name, bluetoothMac, espId, rssi }

  Configure (before flashing)
  --------------------------
  1) Edit WIFI_SSID / WIFI_PASS
  2) Edit SERVER_HOST to your laptop's LAN IP OR your Vercel URL
  3) Edit SERVER_PORT (3000 / 3002 for local, 443 for Vercel/HTTPS)
  4) Edit ESP_ID — must be UNIQUE across all your scanners,
     and must match what you register in Devices -> ESP32 Scanners
  ============================================================================
*/

#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// ─── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID  = "dmk";
const char* WIFI_PASS  = "00000000";

const char* SERVER_HOST  = "10.161.144.235";   // your laptop's LAN IP, or Vercel hostname
const int   SERVER_PORT  = 3002;
const char* PATROL_PATH  = "/api/patrol-events";

const char* DEVICE_TOKEN = "";                 // optional, must match .env.local
const char* ESP_ID       = "ESP32-SCANNER-01"; // CHANGE per scanner

// BLE
const char* TAG_NAMES[]          = { "HC-05", "GUARD_TAG_01" };
const int   TAG_NAMES_COUNT      = sizeof(TAG_NAMES) / sizeof(TAG_NAMES[0]);
const int   SCAN_DURATION_SEC    = 5;
const int   BLE_LOOP_DELAY_MS    = 8000;
const int   MAX_CONSECUTIVE_MISSED = 1;
// ───────────────────────────────────────────────────────────────────────────

BLEScan* pBLEScan = nullptr;
int      noDeviceCount = 0;

// Forward declarations
bool isTargetTag(const String& name);
int  postJson(const char* path, const String& body);
void postPatrolEvent(const char* name, const char* mac, int rssi);

// ───────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== Sentinel Patrol Scanner ===");
  Serial.printf("ESP_ID: %s\n", ESP_ID);

  // WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Connecting to WiFi '%s'", WIFI_SSID);
  unsigned long deadline = millis() + 30000;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  }

  // BLE
  BLEDevice::init("Sentinel-Scanner");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);

  Serial.println("BLE scanner ready. Listening for:");
  for (int i = 0; i < TAG_NAMES_COUNT; i++) Serial.printf("  - %s\n", TAG_NAMES[i]);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();

  Serial.println("\n[BLE] scan starting...");
  BLEScanResults* results = pBLEScan->start(SCAN_DURATION_SEC, false);
  int count = results->getCount();
  Serial.printf("[BLE] saw %d device(s)\n", count);

  bool foundAny = false;
  for (int i = 0; i < count; i++) {
    BLEAdvertisedDevice d = results->getDevice(i);
    if (!d.haveName()) continue;

    String name = String(d.getName().c_str());
    String mac  = String(d.getAddress().toString().c_str());
    int    rssi = d.getRSSI();
    Serial.printf("  - %s [%s] %d dBm\n", name.c_str(), mac.c_str(), rssi);

    if (isTargetTag(name)) {
      Serial.println("    -> match, posting patrol-event");
      postPatrolEvent(name.c_str(), mac.c_str(), rssi);
      foundAny = true;
    }
  }
  pBLEScan->clearResults();

  if (foundAny) {
    noDeviceCount = 0;
  } else {
    noDeviceCount++;
    Serial.printf("[BLE] no target tag (miss #%d)\n", noDeviceCount);
    if (noDeviceCount <= MAX_CONSECUTIVE_MISSED) {
      postPatrolEvent("NO_DEVICE", "n/a", 0);
    }
  }

  delay(BLE_LOOP_DELAY_MS);
}

// ───────────────────────────────────────────────────────────────────────────
bool isTargetTag(const String& name) {
  for (int i = 0; i < TAG_NAMES_COUNT; i++) {
    if (name == String(TAG_NAMES[i])) return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
int postJson(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[http] skip - WiFi disconnected");
    return -1;
  }

  WiFiClient client;
  client.setTimeout(5000);
  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.printf("[http] connect to %s:%d failed\n", SERVER_HOST, SERVER_PORT);
    return -1;
  }

  client.print("POST ");
  client.print(path);
  client.println(" HTTP/1.1");
  client.print("Host: ");
  client.print(SERVER_HOST);
  client.print(":");
  client.println(SERVER_PORT);
  client.println("Content-Type: application/json");
  client.println("User-Agent: Sentinel-Scanner/1.0");
  client.println("Accept: */*");
  client.println("Connection: close");
  if (strlen(DEVICE_TOKEN) > 0) {
    client.print("x-device-token: ");
    client.println(DEVICE_TOKEN);
  }
  client.print("Content-Length: ");
  client.println(body.length());
  client.println();
  client.print(body);

  String statusLine = client.readStringUntil('\n');
  statusLine.trim();

  String resp = "";
  unsigned long deadline = millis() + 4000;
  while (millis() < deadline && (client.available() || client.connected())) {
    while (client.available()) resp += (char)client.read();
    delay(20);
    if (resp.length() > 512) break;
  }
  client.stop();

  int sp1 = statusLine.indexOf(' ');
  int sp2 = statusLine.indexOf(' ', sp1 + 1);
  int code = (sp1 > 0 && sp2 > sp1) ? statusLine.substring(sp1 + 1, sp2).toInt() : -1;
  Serial.printf("[http %s] -> %d\n", path, code);
  return code;
}

void postPatrolEvent(const char* name, const char* mac, int rssi) {
  String body = "{\"name\":\"";   body += name;
  body += "\",\"bluetoothMac\":\""; body += mac;
  body += "\",\"espId\":\"";        body += ESP_ID;
  body += "\",\"rssi\":";           body += rssi;
  body += "}";
  postJson(PATROL_PATH, body);
}
