#include <Arduino.h>
#include <ESPmDNS.h>
#include "logger.h"
#include "portal.h"
#include "wifi_mgr.h"
#include "sensor_table.h"
#include "espnow_hub.h"
#include "http_forwarder.h"
#include "ws_server.h"
#include "../include/config.h"
#include "packets.h"

// =============================================================================
// RowTech Hub — Main Entry Point
//
// Boot sequence:
//   1. Serial init
//   2. Check for saved WiFi credentials
//   3. If none: launch captive portal (blocks until credentials saved + restart)
//   4. Connect to WiFi
//   5. Initialize ESP-NOW
//   6. Initialize sensor table + HTTP forwarder
//   7. Main loop: beacon broadcast + telemetry POST + LED status
// =============================================================================

static uint32_t s_lastBeaconMs    = 0;
static uint32_t s_lastTelemetryMs = 0;
static uint32_t s_lastLedUpdateMs = 0;
static bool     s_prevConnected   = false;

// --- LED status (uses onboard LED; adapt to RGB LED if available) ---
// On Lolin32 Lite: single LED on PIN 22 (active LOW)
// Status encoding via blink pattern:
//   0 sensors: fast blink (red-like urgency)
//   1-7 sensors: slow blink (partially connected)
//   8 sensors: solid on (all connected)
#define STATUS_LED_PIN  22

static void update_status_led() {
  const int active = sensor_table_active_count();
  const uint32_t now = millis();

  if (active == 0) {
    // Fast blink (10Hz)
    if (now - s_lastLedUpdateMs >= 50) {
      s_lastLedUpdateMs = now;
      digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    }
  } else if (active < HUB_MAX_SENSORS) {
    // Slow blink (2Hz)
    if (now - s_lastLedUpdateMs >= 250) {
      s_lastLedUpdateMs = now;
      digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    }
  } else {
    // Solid on
    digitalWrite(STATUS_LED_PIN, LOW);  // Active LOW
  }
}

// ESP-NOW callbacks — called from receive interrupt context; keep minimal
static void on_telemetry_received(const TelemetryPacket* pkt) {
  // Push to local WebSocket clients immediately — this is the ~5ms path.
  // ws_server_push() is non-blocking and skips work if no clients connected.
  ws_server_push(pkt->mac,
                 pkt->phase,
                 pkt->roll,
                 pkt->pitch,
                 pkt->featherAngle,
                 pkt->rushScore,
                 pkt->strokeRate,
                 pkt->catchSharpness,
                 pkt->batteryVoltage,
                 pkt->timestamp);
}

static void on_stroke_received(const StrokeSummaryPacket* pkt) {
  // Immediately forward to API (or buffer if WiFi down)
  http_forwarder_post_stroke(pkt);
}

void setup() {
  logger_init(115200);
  LOG_INFO("BOOT", "RowTech Hub v%s starting", FIRMWARE_VERSION);

  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, HIGH);  // Off initially (active LOW)

  // --- Check WiFi credentials ---
  if (!wifi_mgr_has_credentials()) {
    LOG_INFO("BOOT", "No WiFi credentials — launching captive portal");
    portal_start();  // Blocks until restart
  }

  // --- Connect to WiFi ---
  LOG_INFO("BOOT", "Connecting to WiFi...");
  if (!wifi_mgr_connect()) {
    LOG_WARN("BOOT", "WiFi connection failed — will retry in background");
  }

  // --- Initialize modules ---
  sensor_table_init();

  if (!espnow_hub_init(on_telemetry_received, on_stroke_received)) {
    LOG_ERROR("BOOT", "FATAL: ESP-NOW init failed — halting");
    // Fast blink error
    while (true) {
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(50);
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(50);
    }
  }

  http_forwarder_init();

  // Local WebSocket server — browsers on the LAN connect to ws://rowtech.local:81
  ws_server_begin();

  // mDNS — advertise as "rowtech.local" so browser doesn't need to know the IP
  if (MDNS.begin("rowtech")) {
    MDNS.addService("ws", "tcp", 81);
    LOG_INFO("BOOT", "mDNS started — reachable at rowtech.local:81");
  } else {
    LOG_WARN("BOOT", "mDNS init failed — use hub IP directly");
  }

  LOG_INFO("BOOT", "Hub ready. Local WS: ws://%s:81  Cloud: %s",
           WiFi.localIP().toString().c_str(), VERCEL_BASE_URL);
  LOG_INFO("BOOT", "Hub IP: %s", WiFi.localIP().toString().c_str());
}

void loop() {
  const uint32_t now = millis();

  // --- WiFi maintenance ---
  const bool currentlyConnected = wifi_mgr_is_connected();
  if (!s_prevConnected && currentlyConnected) {
    LOG_INFO("WIFI", "WiFi (re)connected — flushing stroke buffer");
    http_forwarder_flush_buffer();
  }
  s_prevConnected = currentlyConnected;
  wifi_mgr_update();

  // --- Local WebSocket server ---
  ws_server_loop();

  // --- ESP-NOW processing (ACK dispatch, etc.) ---
  espnow_hub_update();

  // --- Age out inactive sensors ---
  sensor_table_age();

  // --- Beacon broadcast every BEACON_INTERVAL_MS ---
  if (now - s_lastBeaconMs >= BEACON_INTERVAL_MS) {
    s_lastBeaconMs = now;
    espnow_hub_broadcast_beacon();
    LOG_DEBUG("ESPNOW", "Beacon broadcast, active sensors: %d/%d",
              sensor_table_active_count(), HUB_MAX_SENSORS);
  }

  // --- Telemetry POST every TELEMETRY_POST_INTERVAL_MS ---
  if (now - s_lastTelemetryMs >= TELEMETRY_POST_INTERVAL_MS) {
    s_lastTelemetryMs = now;
    http_forwarder_post_telemetry();
  }

  // --- LED status update ---
  update_status_led();

  delay(1);
}
