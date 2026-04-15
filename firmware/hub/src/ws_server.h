#pragma once
#include <stdint.h>

// =============================================================================
// ws_server — Local WebSocket server (port 81)
//
// Streams sensor telemetry directly to any browser on the LAN at ~5ms latency,
// bypassing the cloud entirely. Called from main loop; push called on every
// ESP-NOW telemetry packet so updates are immediate, not batched.
//
// Message format (JSON, one object per push):
//   { "mac":"AA:BB:CC:DD:EE:FF", "phase":2, "roll":87.3, "pitch":1.2,
//     "featherAngle":87.3, "rushScore":2.1, "strokeRate":28.5,
//     "catchSharpness":95, "batteryVoltage":3.72, "timestamp":12345678 }
// =============================================================================

// Call once after WiFi is connected.
void ws_server_begin();

// Call every loop() iteration — processes WebSocket events.
void ws_server_loop();

// Push one sensor's telemetry to all connected clients immediately.
// Safe to call from the ESP-NOW receive callback (runs on Arduino main task).
void ws_server_push(const char* mac,
                    uint8_t  phase,
                    float    roll,
                    float    pitch,
                    float    featherAngle,
                    float    rushScore,
                    float    strokeRate,
                    uint16_t catchSharpness,
                    float    batteryVoltage,
                    uint32_t timestamp);

// Returns number of currently connected WebSocket clients.
int ws_server_client_count();
