#include "http_forwarder.h"
#include "sensor_table.h"
#include "wifi_mgr.h"
#include "logger.h"
#include "../include/config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <string.h>

// =============================================================================
// HTTP Forwarder Implementation
//
// Uses WiFiClientSecure with certificate verification disabled.
// For production, pin the Vercel root cert here.
//
// Stroke packet ring buffer: holds up to HTTP_BUFFER_MAX_PACKETS summaries
// to survive WiFi outages.
// =============================================================================

static StrokeSummaryPacket s_strokeBuffer[HTTP_BUFFER_MAX_PACKETS];
static int  s_bufferHead  = 0;
static int  s_bufferTail  = 0;
static int  s_bufferCount = 0;

static uint32_t s_backoffMs      = HTTP_BACKOFF_BASE_MS;
static uint32_t s_lastFailMs     = 0;
static bool     s_backoffActive  = false;

static WiFiClientSecure s_client;
static HTTPClient       s_http;
static bool             s_httpInitialized = false;

static void init_http_client() {
  if (!s_httpInitialized) {
    s_client.setInsecure();  // Accept self-signed / any cert
    s_httpInitialized = true;
  }
}

static bool backoff_allow() {
  if (!s_backoffActive) return true;
  if (millis() - s_lastFailMs >= s_backoffMs) {
    s_backoffActive = false;
    return true;
  }
  return false;
}

static void backoff_on_failure() {
  s_lastFailMs    = millis();
  s_backoffActive = true;
  s_backoffMs     = min((uint32_t)(s_backoffMs * HTTP_BACKOFF_MULTIPLIER),
                         (uint32_t)HTTP_BACKOFF_MAX_MS);
  LOG_WARN("HTTP", "Backoff activated — next retry in %lums", s_backoffMs);
}

static void backoff_reset() {
  s_backoffMs     = HTTP_BACKOFF_BASE_MS;
  s_backoffActive = false;
}

// Perform POST. Returns HTTP response code, or negative on error.
static int do_post(const char* url, const String& body) {
  init_http_client();

  s_http.begin(s_client, url);
  s_http.setTimeout(HTTP_TIMEOUT_MS);
  s_http.addHeader("Content-Type", "application/json");
  s_http.addHeader("x-hub-secret", HUB_SECRET);

  const int code = s_http.POST(body);
  if (code > 0) {
    LOG_DEBUG("HTTP", "POST %s → %d", url, code);
  } else {
    LOG_WARN("HTTP", "POST %s failed: %s", url, s_http.errorToString(code).c_str());
  }
  s_http.end();
  return code;
}

void http_forwarder_init() {
  memset(s_strokeBuffer, 0, sizeof(s_strokeBuffer));
  s_bufferHead  = 0;
  s_bufferTail  = 0;
  s_bufferCount = 0;
  s_backoffMs   = HTTP_BACKOFF_BASE_MS;
}

void http_forwarder_post_telemetry() {
  if (!wifi_mgr_is_connected()) return;
  if (!backoff_allow()) return;

  const SensorState* sensors = sensor_table_get_all();

  // Build JSON array of all sensor states
  JsonDocument doc;
  JsonArray arr = doc.to<JsonArray>();

  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (!sensors[i].active) continue;
    JsonObject obj = arr.add<JsonObject>();
    obj["mac"]            = sensors[i].mac;
    obj["phase"]          = sensors[i].phase;
    obj["roll"]           = sensors[i].roll;
    obj["pitch"]          = sensors[i].pitch;
    obj["featherAngle"]   = sensors[i].featherAngle;
    obj["rushScore"]      = sensors[i].rushScore;
    obj["strokeRate"]     = sensors[i].strokeRate;
    obj["catchSharpness"] = sensors[i].catchSharpness;
    obj["batteryVoltage"] = sensors[i].batteryVoltage;
    obj["timestamp"]      = sensors[i].lastSeen;
  }

  if (arr.size() == 0) return;

  String body;
  serializeJson(doc, body);

  const int code = do_post(TELEMETRY_ENDPOINT, body);
  if (code == 200 || code == 201) {
    backoff_reset();
  } else if (code >= 500 || code < 0) {
    backoff_on_failure();
  }
}

void http_forwarder_post_stroke(const StrokeSummaryPacket* pkt) {
  if (wifi_mgr_is_connected() && backoff_allow()) {
    // Attempt immediate POST
    JsonDocument doc;
    JsonObject obj = doc.to<JsonObject>();
    obj["mac"]                = pkt->mac;
    obj["featherAngle"]       = pkt->featherAngle;
    obj["featherConsistency"] = pkt->featherConsistency;
    obj["rushScore"]          = pkt->rushScore;
    obj["catchSharpness"]     = pkt->catchSharpness;
    obj["strokeRate"]         = pkt->strokeRate;
    obj["timestamp"]          = pkt->timestamp;

    String body;
    serializeJson(doc, body);

    const int code = do_post(STROKES_ENDPOINT, body);
    if (code == 200 || code == 201) {
      backoff_reset();
      return;
    }
    backoff_on_failure();
  }

  // Buffer the packet if send failed or WiFi down
  if (s_bufferCount < HTTP_BUFFER_MAX_PACKETS) {
    memcpy(&s_strokeBuffer[s_bufferTail], pkt, sizeof(StrokeSummaryPacket));
    s_bufferTail = (s_bufferTail + 1) % HTTP_BUFFER_MAX_PACKETS;
    s_bufferCount++;
    LOG_DEBUG("HTTP", "Stroke buffered (%d/%d)", s_bufferCount, HTTP_BUFFER_MAX_PACKETS);
  } else {
    LOG_WARN("HTTP", "Stroke buffer full — packet dropped");
  }
}

void http_forwarder_flush_buffer() {
  if (s_bufferCount == 0) return;
  if (!wifi_mgr_is_connected()) return;

  LOG_INFO("HTTP", "Flushing %d buffered stroke packets", s_bufferCount);

  while (s_bufferCount > 0 && wifi_mgr_is_connected()) {
    const StrokeSummaryPacket* pkt = &s_strokeBuffer[s_bufferHead];

    JsonDocument doc;
    JsonObject obj = doc.to<JsonObject>();
    obj["mac"]                = pkt->mac;
    obj["featherAngle"]       = pkt->featherAngle;
    obj["featherConsistency"] = pkt->featherConsistency;
    obj["rushScore"]          = pkt->rushScore;
    obj["catchSharpness"]     = pkt->catchSharpness;
    obj["strokeRate"]         = pkt->strokeRate;
    obj["timestamp"]          = pkt->timestamp;

    String body;
    serializeJson(doc, body);

    const int code = do_post(STROKES_ENDPOINT, body);
    if (code == 200 || code == 201) {
      s_bufferHead = (s_bufferHead + 1) % HTTP_BUFFER_MAX_PACKETS;
      s_bufferCount--;
    } else {
      LOG_WARN("HTTP", "Flush failed (code=%d) — stopping flush", code);
      break;
    }

    delay(50);  // Brief pause between flush sends to avoid overwhelming API
  }

  LOG_INFO("HTTP", "Flush complete — %d packets remaining", s_bufferCount);
}

int http_forwarder_buffer_count() {
  return s_bufferCount;
}
