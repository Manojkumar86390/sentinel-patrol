/*
  ============================================================================
  Sentinel — Emergency Switch (Product 2 of 2)
  ============================================================================
  This ESP32 is the Emergency Switch — a panic button device kept at the
  security guard's desk. It does ONE job: when a button is pressed, POST an
  alert to the website which then sends a Telegram message + plays a voice
  alarm on the dashboard.

  PAIR THIS WITH: sentinel-patrol-scanner.ino (separate product, on its own
  ESP32, fixed at a checkpoint for BLE scanning).

  Buttons (active LOW with INPUT_PULLUP):
    GPIO 13 -> BLEEDING
    GPIO 12 -> ACCIDENT
    GPIO 14 -> FIRE
    GPIO 27 -> FIGHT

  Endpoint
  --------
    POST /api/emergency-alerts   { type, switchId }
        type    = "accident" | "fire" | "bleeding" | "fight"
        switchId = unique ID for this switch (e.g. "ESP32-SWITCH-01")

  Configure (before flashing)
  --------------------------
  1) Edit WIFI_SSID / WIFI_PASS
  2) Edit SERVER_HOST to your laptop's LAN IP OR your Vercel URL
  3) Edit SERVER_PORT (3000 / 3002 for local, 443 for Vercel/HTTPS)
  4) Edit SWITCH_ID — must be UNIQUE per switch, and must match what you
     register in Devices -> Emergency Switches
  ============================================================================
*/

#include <WiFi.h>

// ─── CONFIGURE THESE ────────────────────────────────────────────────────────
const char* WIFI_SSID  = "dmk";
const char* WIFI_PASS  = "00000000";

const char* SERVER_HOST  = "10.161.144.235";    // your laptop's LAN IP, or Vercel hostname
const int   SERVER_PORT  = 3002;
const char* ALERT_PATH   = "/api/emergency-alerts";

const char* DEVICE_TOKEN = "";                  // optional
const char* SWITCH_ID    = "ESP32-SWITCH-01";   // CHANGE per switch

// Buttons (active LOW with INPUT_PULLUP, no external resistors needed)
const int PIN_BLEEDING = 13;
const int PIN_ACCIDENT = 12;
const int PIN_FIRE     = 14;
const int PIN_FIGHT    = 27;

// Heartbeat (so the dashboard can show this switch as online/offline)
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;   // every 30s

const unsigned long BTN_COOLDOWN_MS = 10000;         // per-button cooldown
const unsigned long BTN_DEBOUNCE_MS = 50;            // hardware debounce
// ───────────────────────────────────────────────────────────────────────────

struct ButtonState {
  int           pin;
  const char*   type;
  bool          lastStable;
  bool          lastRaw;
  unsigned long lastChangeMs;
  unsigned long lastFiredMs;
};

ButtonState buttons[] = {
  { PIN_BLEEDING, "bleeding", HIGH, HIGH, 0, 0 },
  { PIN_ACCIDENT, "accident", HIGH, HIGH, 0, 0 },
  { PIN_FIRE,     "fire",     HIGH, HIGH, 0, 0 },
  { PIN_FIGHT,    "fight",    HIGH, HIGH, 0, 0 },
};
const int BUTTON_COUNT = sizeof(buttons) / sizeof(buttons[0]);

unsigned long lastHeartbeatAt = 0;

// Forward decls
int  postJson(const char* path, const String& body);
void postEmergencyAlert(const char* type);
void postHeartbeat();

// ───────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n=== Sentinel Emergency Switch ===");
  Serial.printf("SWITCH_ID: %s\n", SWITCH_ID);

  for (int i = 0; i < BUTTON_COUNT; i++) {
    pinMode(buttons[i].pin, INPUT_PULLUP);
  }

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

  Serial.println("Buttons ready:");
  Serial.printf("  GPIO %d -> BLEEDING\n", PIN_BLEEDING);
  Serial.printf("  GPIO %d -> ACCIDENT\n", PIN_ACCIDENT);
  Serial.printf("  GPIO %d -> FIRE\n",     PIN_FIRE);
  Serial.printf("  GPIO %d -> FIGHT\n",    PIN_FIGHT);

  // Initial heartbeat so the dashboard sees us right away.
  postHeartbeat();
}

// ───────────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();

  // Heartbeat
  if (now - lastHeartbeatAt >= HEARTBEAT_INTERVAL_MS) {
    postHeartbeat();
    lastHeartbeatAt = now;
  }

  // Poll buttons (with debounce + cooldown)
  for (int i = 0; i < BUTTON_COUNT; i++) {
    ButtonState& b = buttons[i];
    int raw = digitalRead(b.pin);

    if (raw != b.lastRaw) {
      b.lastRaw = raw;
      b.lastChangeMs = now;
    } else if ((now - b.lastChangeMs) >= BTN_DEBOUNCE_MS && raw != b.lastStable) {
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
          Serial.printf("[BTN] %s pressed but cooldown active\n", b.type);
        }
      }
    }
  }

  delay(10);
}

// ───────────────────────────────────────────────────────────────────────────
int postJson(const char* path, const String& body) {
  if (WiFi.status() != WL_CONNECTED) return -1;

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
  client.println("User-Agent: Sentinel-Switch/1.0");
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
  while (client.available() || client.connected()) {
    if (!client.available()) { delay(20); continue; }
    client.read();
  }
  client.stop();

  int sp1 = statusLine.indexOf(' ');
  int sp2 = statusLine.indexOf(' ', sp1 + 1);
  int code = (sp1 > 0 && sp2 > sp1) ? statusLine.substring(sp1 + 1, sp2).toInt() : -1;
  Serial.printf("[http %s] -> %d\n", path, code);
  return code;
}

void postEmergencyAlert(const char* type) {
  String body = "{\"type\":\""; body += type;
  body += "\",\"switchId\":\"";  body += SWITCH_ID;
  body += "\"}";
  postJson(ALERT_PATH, body);
}

/**
 * Heartbeat — POST an empty alert-style record so the server knows this
 * switch is alive. We use a special type "heartbeat" which the server
 * recognizes and skips creating an alert for.
 */
void postHeartbeat() {
  String body = "{\"type\":\"heartbeat\",\"switchId\":\"";
  body += SWITCH_ID;
  body += "\"}";
  postJson(ALERT_PATH, body);
}
