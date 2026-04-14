#pragma once
#include <stdbool.h>

// =============================================================================
// Captive Portal — First-boot WiFi provisioning
// Creates AP "RowTech-Setup", serves config page, saves credentials, reboots.
// =============================================================================

// Start captive portal AP and DNS server. Blocks until credentials submitted.
// After this function returns, call wifi_mgr_save_credentials() is not needed —
// portal saves them internally and calls ESP.restart().
void portal_start();
