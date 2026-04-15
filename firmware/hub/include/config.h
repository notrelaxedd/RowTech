#pragma once

// =============================================================================
// RowTech Hub Configuration
// =============================================================================

#define FIRMWARE_VERSION        "1.0.0"
#define HUB_MAX_SENSORS         8

// Hardware (Wemos Lolin32 Lite)
#define PIN_LED_RED             25   // Red LED for 0 sensors
#define PIN_LED_GREEN           26   // Green LED for all 8 sensors
#define PIN_LED_BLUE            27   // Blue LED — combined red+blue = amber for 1-7 sensors

// WiFi captive portal AP name
#define PORTAL_SSID             "RowTech-Setup"
#define PORTAL_IP               "192.168.4.1"
#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RETRY_INTERVAL_MS  5000
#define WIFI_MAX_RETRIES        5

// ESP-NOW
#define BEACON_INTERVAL_MS      500      // How often hub broadcasts discovery beacon
#define SENSOR_TIMEOUT_MS       3000     // Mark sensor inactive if no packet for 3s

// HTTP forwarding to Vercel
#define TELEMETRY_POST_INTERVAL_MS  100  // POST all sensor states every 100ms
#define HTTP_TIMEOUT_MS             8000
#define HTTP_BUFFER_MAX_PACKETS     50   // Ring buffer capacity on WiFi disconnect
#define HTTP_BACKOFF_BASE_MS        500  // Initial backoff on HTTP error
#define HTTP_BACKOFF_MAX_MS         30000
#define HTTP_BACKOFF_MULTIPLIER     2

// Vercel endpoint — CHANGE to your deployed URL before flashing
#define VERCEL_BASE_URL         "https://row-tech-dashboard.vercel.app"
#define TELEMETRY_ENDPOINT      VERCEL_BASE_URL "/api/telemetry"
#define STROKES_ENDPOINT        VERCEL_BASE_URL "/api/strokes"

// Hub secret for API authentication — CHANGE to match HUB_SECRET env var
// This is compiled into firmware; treat as sensitive. Use build_flags to inject:
//   build_flags = -DHUB_SECRET='"your-secret-here"'
#ifndef HUB_SECRET
#define HUB_SECRET              "change-me-before-flashing"
#endif

// Preferences namespace for WiFi credentials storage
#define PREFS_NAMESPACE         "rowtech"
#define PREFS_KEY_SSID          "wifi_ssid"
#define PREFS_KEY_PASS          "wifi_pass"

// Packet type identifiers (must match sensor firmware)
#define PACKET_TYPE_BEACON          0x01
#define PACKET_TYPE_REGISTRATION    0x02
#define PACKET_TYPE_ACK             0x03
#define PACKET_TYPE_TELEMETRY       0x04
#define PACKET_TYPE_STROKE_SUMMARY  0x05
