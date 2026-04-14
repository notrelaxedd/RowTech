#include "wifi_mgr.h"
#include "../include/config.h"
#include "logger.h"
#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>

static Preferences s_prefs;
static bool        s_connected     = false;
static uint32_t    s_lastRetryMs   = 0;
static uint8_t     s_retryCount    = 0;

bool wifi_mgr_has_credentials() {
  s_prefs.begin(PREFS_NAMESPACE, true);
  const bool has = s_prefs.isKey(PREFS_KEY_SSID) &&
                   s_prefs.getString(PREFS_KEY_SSID, "").length() > 0;
  s_prefs.end();
  return has;
}

bool wifi_mgr_connect() {
  s_prefs.begin(PREFS_NAMESPACE, true);
  const String ssid = s_prefs.getString(PREFS_KEY_SSID, "");
  const String pass = s_prefs.getString(PREFS_KEY_PASS, "");
  s_prefs.end();

  if (ssid.length() == 0) {
    LOG_WARN("WIFI", "No SSID saved — cannot connect");
    return false;
  }

  LOG_INFO("WIFI", "Connecting to SSID: %s", ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), pass.c_str());

  const uint32_t deadline = millis() + WIFI_CONNECT_TIMEOUT_MS;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    s_connected   = true;
    s_retryCount  = 0;
    LOG_INFO("WIFI", "Connected — IP: %s", WiFi.localIP().toString().c_str());
    return true;
  }

  LOG_WARN("WIFI", "Connection failed (status=%d)", WiFi.status());
  s_connected = false;
  return false;
}

bool wifi_mgr_is_connected() {
  return WiFi.status() == WL_CONNECTED;
}

void wifi_mgr_save_credentials(const char* ssid, const char* password) {
  s_prefs.begin(PREFS_NAMESPACE, false);
  s_prefs.putString(PREFS_KEY_SSID, ssid);
  s_prefs.putString(PREFS_KEY_PASS, password);
  s_prefs.end();
  LOG_INFO("WIFI", "Credentials saved for SSID: %s", ssid);
}

void wifi_mgr_clear_credentials() {
  s_prefs.begin(PREFS_NAMESPACE, false);
  s_prefs.remove(PREFS_KEY_SSID);
  s_prefs.remove(PREFS_KEY_PASS);
  s_prefs.end();
  LOG_INFO("WIFI", "Credentials cleared");
}

void wifi_mgr_update() {
  if (wifi_mgr_is_connected()) {
    s_retryCount = 0;
    return;
  }

  const uint32_t now = millis();
  if (now - s_lastRetryMs < WIFI_RETRY_INTERVAL_MS) return;
  s_lastRetryMs = now;

  if (s_retryCount >= WIFI_MAX_RETRIES) {
    // Keep trying but log less frequently
    if (s_retryCount % 10 == 0) {
      LOG_WARN("WIFI", "WiFi still disconnected after %d attempts", s_retryCount);
    }
  } else {
    LOG_INFO("WIFI", "Reconnect attempt %d/%d", s_retryCount + 1, WIFI_MAX_RETRIES);
  }

  s_retryCount++;
  wifi_mgr_connect();
}
