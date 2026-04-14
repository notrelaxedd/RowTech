#pragma once
#include <stdbool.h>

// =============================================================================
// WiFi Manager
// Loads saved credentials from Preferences, connects with retry.
// =============================================================================

// Returns true if credentials are saved in flash.
bool wifi_mgr_has_credentials();

// Attempt to connect using saved credentials. Blocks until connected or
// all retries exhausted. Returns true on success.
bool wifi_mgr_connect();

// Returns true if WiFi is currently connected.
bool wifi_mgr_is_connected();

// Save new credentials to flash (called by captive portal on form submit).
void wifi_mgr_save_credentials(const char* ssid, const char* password);

// Clear saved credentials (debug / factory reset).
void wifi_mgr_clear_credentials();

// Call in loop — handles reconnection attempts on disconnect.
void wifi_mgr_update();
