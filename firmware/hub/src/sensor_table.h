#pragma once
#include <stdint.h>
#include <stdbool.h>

// =============================================================================
// Active Sensor State Table
// Tracks up to HUB_MAX_SENSORS (8) registered oar sensors.
// =============================================================================

struct SensorState {
  char     mac[18];         // "AA:BB:CC:DD:EE:FF\0"
  uint8_t  phase;
  float    roll;
  float    pitch;
  float    featherAngle;
  float    rushScore;
  float    strokeRate;
  uint16_t catchSharpness;
  float    batteryVoltage;
  uint32_t lastSeen;        // millis() when last packet was received
  bool     active;          // false = slot empty or sensor timed out
};

void sensor_table_init();

// Find or allocate a slot for this MAC. Returns slot index or -1 if full.
int sensor_table_register(const char* mac);

// Update telemetry for an existing sensor by MAC.
// Returns false if MAC not found.
bool sensor_table_update_telemetry(const char* mac,
                                   uint8_t phase,
                                   float roll, float pitch,
                                   float featherAngle,
                                   float rushScore,
                                   float strokeRate,
                                   uint16_t catchSharpness,
                                   float batteryVoltage,
                                   uint32_t timestamp);

// Mark sensors inactive if lastSeen > SENSOR_TIMEOUT_MS
void sensor_table_age();

// Returns pointer to the full table (read-only)
const SensorState* sensor_table_get_all();

// Returns count of currently active sensors
int sensor_table_active_count();

// Returns true if MAC is already registered
bool sensor_table_is_registered(const char* mac);
