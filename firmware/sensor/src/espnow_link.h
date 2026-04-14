#pragma once
#include <stdint.h>
#include <stdbool.h>

// =============================================================================
// ESP-NOW Registration & Transport Layer (Sensor Side)
// =============================================================================

enum class LinkState {
  SEARCHING,    // Awaiting discovery beacon from hub
  REGISTERING,  // Sent registration packet, awaiting ACK
  CONNECTED,    // Registered and streaming telemetry
};

// Initialize ESP-NOW and begin listening for hub beacon on broadcast address.
// Returns false if ESP-NOW initialization fails.
bool espnow_init();

// Process incoming ESP-NOW events. Call in main loop.
void espnow_update();

// Returns current link state.
LinkState espnow_get_state();

// Send telemetry packet to registered hub.
// Must be CONNECTED state; silently no-ops otherwise.
void espnow_send_telemetry(const struct TelemetryPacket& pkt);

// Send stroke summary packet to registered hub.
// Must be CONNECTED state; silently no-ops otherwise.
void espnow_send_stroke_summary(const struct StrokeSummaryPacket& pkt);

// Returns true if the hub has been silent for HUB_TIMEOUT_MS.
// Caller should call espnow_reset_to_search() in this case.
bool espnow_hub_timed_out();

// Reset back to SEARCHING state (re-enter registration mode).
void espnow_reset_to_search();
