#pragma once
#include <stdbool.h>
#include "packets.h"

// =============================================================================
// ESP-NOW Hub Module
// Broadcasts discovery beacons, handles sensor registration, dispatches packets.
// =============================================================================

// Callback types for received sensor data
typedef void (*OnTelemetryReceived)(const TelemetryPacket* pkt);
typedef void (*OnStrokeSummaryReceived)(const StrokeSummaryPacket* pkt);

// Initialize ESP-NOW in STA mode (channel must match WiFi AP channel).
// Returns false if ESP-NOW init fails.
bool espnow_hub_init(OnTelemetryReceived telemetryCb, OnStrokeSummaryReceived strokeCb);

// Broadcast discovery beacon to FF:FF:FF:FF:FF:FF.
// Call every BEACON_INTERVAL_MS from main loop.
void espnow_hub_broadcast_beacon();

// Process incoming registration requests and send ACKs.
// Driven by ESP-NOW callbacks internally; call update() to tick.
void espnow_hub_update();
