/*
  ============================================================================
  Sentinel Patrol Scanner + Emergency Buttons (v4, dual-core)
  ============================================================================
  Each ESP32 does TWO things in parallel:

    1. BLE scanning (Core 0) – scans for guard tags (HC-05, GUARD_TAG_01),
       POSTs detections to /api/patrol-events every 8 seconds.

    2. Emergency buttons (Core 1) – polls 4 hardware buttons every 10ms.
       On a falling edge (press) with cooldown elapsed, POSTs to
       /api/emergency-alerts.

  Buttons (active LOW with INPUT_PULLUP):
    GPIO 13 -> BLEEDING
    GPIO 12 -> ACCIDENT
    GPIO 14 -> FIRE
    GPIO 27 -> FIGHT

  Endpoints
  ---------
    POST /api/patrol-events        { name, bluetoothMac, espId }
    POST /api/emergency-alerts     { type, espId }      type = accident|fire|bleeding|fight

  Configure
  ---------
  1) Edit WIFI_SSID / WIFI_PASS
  2) Edit SERVER_HOST to your laptop's LAN IP
  3) Edit SERVER_PORT (3000 / 3002 / whatever your dashboard runs on)
  4) Edit ESP_ID — must match what you register in Devices -> ESP32 Scanners
  5) Compile and flash. Required boards: ESP32 Dev Module. No extra libraries.
  ============================================================================
*/

#include <WiFi.h>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// ─── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID  = "DMK";
const char* WIFI_PASS  = "88888888";

const char* SERVER_HOST  = "172.16.104.15";   // your laptop's LAN IP
const int   SERVER_PORT  = 3002;
const char* PATROL_PATH  = "/api/patrol-events";
const char* ALERT_PATH   = "/api/emergency-alerts";

const char* DEVICE_TOKEN = "";                // optional, must match .env.local
const char* ESP_ID       = "SCANNER-01";

// BLE
const char* TAG_NAMES[] = { "HC-05", "GUARD_TAG_01" };
const int TAG_NAMES_COUNT = sizeof(TAG_NAMES) / sizeof(TAG_NAMES[0]);
const int SCAN_DURATION_SEC      = 5;
const int BLE_LOOP_DELAY_MS      = 8000;
const int MAX_CONSECUTIVE_MISSED = 1;

// Buttons
const int PIN_BLEEDING = 23;
const int PIN_ACCIDENT = 22;
const int PIN_FIRE     = 1;
const int PIN_FIGHT    = 3;
const unsigned long BTN_COOLDOWN_MS = 10000;  // per-button cooldown
const unsigned long BTN_DEBOUNCE_MS = 50;     // hardware debounce
// ───────────────────────────────────────────────────────────────────────────

BLEScan* pBLEScan = nullptr;
int      noDeviceCount = 0;

// Forward declarations so setup() can reference these tasks before they're
// defined further down in the file. (Arduino's auto-prototype generator
// can't always infer these.)
void bleTask(void* arg);
void buttonTask(void* arg);
bool isTargetTag(const String& name);
int  postJson(const char* path, const String& body);
void postPatrolEvent(const char* name, const char* mac);
void postEmergencyAlert(const char* type);

// Button state for falling-edge detection + cooldown
struct ButtonState {
  int           pin;
  const char*   type;          // "bleeding" / "accident" / "fire" / "fight"
  bool          lastStable;    // last debounced level
  bool          lastRaw;       // last raw read
  unsigned long lastChangeMs;  // for debounce
  unsigned long lastFiredMs;   // for cooldown
};

ButtonState buttons[] = {
  { PIN_BLEEDING, "bleeding", HIGH, HIGH, 0, 0 },
  { PIN_ACCIDENT, "accident", HIGH, HIGH, 0, 0 },
  { PIN_FIRE,     "fire",     HIGH, HIGH, 0, 0 },
  { PIN_FIGHT,    "fight",    HIGH, HIGH, 0, 0 },
};
const int BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);

void bleTask(void* arg);
void buttonTask(void* arg);

// Forward declarations — needed because these functions take void* parameters,
// which the Arduino IDE's auto-prototype generator can't always handle.
void bleTask(void* arg);
void buttonTask(void* arg);
bool isTargetTag(const String& name);
int  postJson(const char* path, const String& body);
void postPatrolEvent(const char* name, const char* mac);
void postEmergencyAlert(const char* type);

// ───────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== Sentinel v4 (Patrol + Emergency) ===");
  Serial.printf("ESP_ID: %s\n", ESP_ID);

  // Pin setup
  for (int i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }

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

  Serial.println("Buttons ready:");
  Serial.printf("  GPIO %d -> BLEEDING\n", PIN_BLEEDING);
  Serial.printf("  GPIO %d -> ACCIDENT\n", PIN_ACCIDENT);
  Serial.printf("  GPIO %d -> FIRE\n",     PIN_FIRE);
  Serial.printf("  GPIO %d -> FIGHT\n",    PIN_FIGHT);

  // Spawn the two tasks pinned to opposite cores so BLE scanning never
  // makes us miss a button press.
  xTaskCreatePinnedToCore(bleTask,    "ble",    8192, nullptr, 1, nullptr, 0);
  xTaskCreatePinnedToCore(buttonTask, "button", 4096, nullptr, 2, nullptr, 1);
}

void loop() {
  // Idle — work happens in the two pinned tasks above.
  vTaskDelay(portMAX_DELAY);
}

// ───────────────────────────────────────────────────────────────────────────
// Core 0: BLE scan loop
// ───────────────────────────────────────────────────────────────────────────
void bleTask(void* /*arg*/) {
  for (;;) {
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
        postPatrolEvent(name.c_str(), mac.c_str());
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
        postPatrolEvent("NO_DEVICE", "n/a");
      }
    }

    vTaskDelay(BLE_LOOP_DELAY_MS / portTICK_PERIOD_MS);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Core 1: button monitoring loop
// Falling-edge detection + debounce + per-button cooldown.
// ───────────────────────────────────────────────────────────────────────────
void buttonTask(void* /*arg*/) {
  for (;;) {
    unsigned long now = millis();
    for (int i = 0; i < BUTTON_COUNT; i++) {
      ButtonState& b = buttons[i];
      int raw = digitalRead(b.pin);

      // Debounce: only accept a level change if it has been stable >= 50ms.
      if (raw != b.lastRaw) {
        b.lastRaw = raw;
        b.lastChangeMs = now;
      } else if ((now - b.lastChangeMs) >= BTN_DEBOUNCE_MS && raw != b.lastStable) {
        // Stable level changed.
        bool wasHigh = (b.lastStable == HIGH);
        b.lastStable = raw;
        bool isLowNow = (raw == LOW);

        if (wasHigh && isLowNow) {
          // Falling edge = press. Check cooldown.
          if ((now - b.lastFiredMs) >= BTN_COOLDOWN_MS) {
            b.lastFiredMs = now;
            Serial.printf("[BTN] %s pressed -> posting alert\n", b.type);
            postEmergencyAlert(b.type);
          } else {
            Serial.printf("[BTN] %s pressed but cooldown active (%lu ms left)\n",
                          b.type, BTN_COOLDOWN_MS - (now - b.lastFiredMs));
          }
        }
      }
    }
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// ───────────────────────────────────────────────────────────────────────────
bool isTargetTag(const String& name) {
  for (int i = 0; i < TAG_NAMES_COUNT; i++) {
    if (name == String(TAG_NAMES[i])) return true;
  }
  return false;
}

// ───────────────────────────────────────────────────────────────────────────
// HTTP plumbing — raw WiFiClient POST.  Both endpoints use the same code path
// so any future tweaks (TLS, retries) happen in one place.
// ───────────────────────────────────────────────────────────────────────────
int postJson(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[http] skip — WiFi disconnected");
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
  client.println("User-Agent: Sentinel-ESP32/4.0");
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

void postPatrolEvent(const char* name, const char* mac) {
  String body = "{\"name\":\"";   body += name;
  body += "\",\"bluetoothMac\":\""; body += mac;
  body += "\",\"espId\":\"";        body += ESP_ID;
  body += "\"}";
  postJson(PATROL_PATH, body);
}

void postEmergencyAlert(const char* type) {
  String body = "{\"type\":\""; body += type;
  body += "\",\"espId\":\"";    body += ESP_ID;
  body += "\"}";
  postJson(ALERT_PATH, body);
}