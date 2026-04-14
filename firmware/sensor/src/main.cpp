#include <Arduino.h>
#include "led.h"
#include "imu.h"
#include "stroke_fsm.h"
#include "espnow_link.h"
#include "packets.h"
#include "../include/config.h"

// =============================================================================
// RowTech Oar Sensor — Main Entry Point
//
// Boot sequence:
//   1. Serial + LED init
//   2. IMU init + calibration (2s flat)
//   3. ESP-NOW init
//   4. Wait for hub registration
//   5. Main 200Hz loop
// =============================================================================

static char     s_ownMacStr[18]     = {};
static uint32_t s_lastTelemetryMs   = 0;
static uint32_t s_lastBatteryReadMs = 0;
static float    s_batteryVoltage    = 0.0f;

// esp_timer callback — fires every LOOP_INTERVAL_US (5000µs = 200Hz)
static void IRAM_ATTR imu_loop_callback(void* arg) {
  imu_update();

  const ImuData& imu = imu_get();
  const bool strokeDone = fsm_update(imu);

  if (strokeDone && espnow_get_state() == LinkState::CONNECTED) {
    const StrokeMetrics& m = fsm_get_stroke_metrics();
    StrokeSummaryPacket pkt = {};
    pkt.type                = PKT_STROKE_SUMMARY;
    memcpy(pkt.mac, s_ownMacStr, sizeof(pkt.mac));
    pkt.featherAngle       = m.featherAngle;
    pkt.featherConsistency = m.featherConsistency;
    pkt.rushScore          = m.rushScore;
    pkt.catchSharpness     = m.catchSharpness;
    pkt.strokeRate         = m.strokeRate;
    pkt.timestamp          = millis();
    espnow_send_stroke_summary(pkt);
  }
}

static void blink_sos_blocking() {
  // SOS: 3 short (150ms), 3 long (450ms), 3 short (150ms), pause 1500ms — loop forever
  led_set_mode(LedMode::SOS);
  while (true) {
    led_update();
    delay(1);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\n\n[BOOT] RowTech Sensor v%s\n", FIRMWARE_VERSION);

  // --- LED init ---
  led_init();
  led_set_mode(LedMode::BLINK_SLOW);

  // --- IMU init ---
  Serial.println("[BOOT] Initializing IMU...");
  if (!imu_init()) {
    Serial.println("[BOOT] FATAL: IMU not found — halting");
    blink_sos_blocking();
  }

  // --- Calibration (blocking 2s) ---
  imu_calibrate();

  // --- ESP-NOW init ---
  Serial.println("[BOOT] Initializing ESP-NOW...");
  if (!espnow_init()) {
    Serial.println("[BOOT] FATAL: ESP-NOW init failed — halting");
    led_set_mode(LedMode::BLINK_FAST);
    while (true) {
      led_update();
      delay(1);
    }
  }

  // --- FSM init ---
  fsm_init();

  // --- Read own MAC ---
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  snprintf(s_ownMacStr, sizeof(s_ownMacStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  // --- Wait for hub registration ---
  Serial.println("[BOOT] Waiting for hub registration...");
  const uint32_t searchStart = millis();
  while (espnow_get_state() != LinkState::CONNECTED) {
    led_update();
    espnow_update();

    const uint32_t elapsed = millis() - searchStart;
    if (elapsed % 10000 < 50) {
      Serial.printf("[BOOT] Still searching for hub... (%lus elapsed)\n", elapsed / 1000);
    }
    delay(1);
  }

  led_set_mode(LedMode::SOLID);
  Serial.println("[BOOT] Registered with hub — starting main loop");

  // --- Initial battery read ---
  s_batteryVoltage    = imu_read_battery_voltage();
  s_lastBatteryReadMs = millis();

  // --- Start 200Hz IMU timer ---
  esp_timer_handle_t imuTimer;
  esp_timer_create_args_t timerArgs = {
    .callback        = imu_loop_callback,
    .arg             = nullptr,
    .dispatch_method = ESP_TIMER_TASK,
    .name            = "imu_loop",
  };
  ESP_ERROR_CHECK(esp_timer_create(&timerArgs, &imuTimer));
  ESP_ERROR_CHECK(esp_timer_start_periodic(imuTimer, LOOP_INTERVAL_US));

  Serial.println("[BOOT] IMU timer started at 200Hz");
}

void loop() {
  const uint32_t now = millis();

  // --- ESP-NOW link maintenance ---
  espnow_update();

  // --- Hub timeout detection ---
  if (espnow_hub_timed_out()) {
    led_set_mode(LedMode::BLINK_SLOW);
    espnow_reset_to_search();

    while (espnow_get_state() != LinkState::CONNECTED) {
      led_update();
      espnow_update();
      delay(1);
    }

    led_set_mode(LedMode::SOLID);
    Serial.println("[LINK] Reconnected to hub");
  }

  // --- Send telemetry every TELEMETRY_INTERVAL_MS ---
  if (now - s_lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    s_lastTelemetryMs = now;

    if (espnow_get_state() == LinkState::CONNECTED) {
      const ImuData&       imu     = imu_get();
      const StrokeMetrics& metrics = fsm_get_live_metrics();

      TelemetryPacket pkt = {};
      pkt.type            = PKT_TELEMETRY;
      memcpy(pkt.mac, s_ownMacStr, sizeof(pkt.mac));
      pkt.phase           = static_cast<uint8_t>(fsm_get_phase());
      pkt.roll            = imu.rollDeg;
      pkt.pitch           = imu.pitchDeg;
      pkt.featherAngle    = metrics.featherAngle;
      pkt.rushScore       = metrics.rushScore;
      pkt.strokeRate      = metrics.strokeRate;
      pkt.catchSharpness  = metrics.catchSharpness;
      pkt.batteryVoltage  = s_batteryVoltage;
      pkt.timestamp       = now;

      espnow_send_telemetry(pkt);
    }
  }

  // --- Battery read every 30s ---
  if (now - s_lastBatteryReadMs >= 30000) {
    s_lastBatteryReadMs = now;
    s_batteryVoltage    = imu_read_battery_voltage();
  }

  // --- LED heartbeat ---
  led_update();

  // Yield to FreeRTOS tasks (esp_timer runs on separate task)
  delay(1);
}
