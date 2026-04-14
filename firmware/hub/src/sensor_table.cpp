#include "sensor_table.h"
#include "../include/config.h"
#include "logger.h"
#include <Arduino.h>
#include <string.h>

static SensorState s_sensors[HUB_MAX_SENSORS];

void sensor_table_init() {
  memset(s_sensors, 0, sizeof(s_sensors));
}

int sensor_table_register(const char* mac) {
  // Check if already registered
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (s_sensors[i].active && strncmp(s_sensors[i].mac, mac, 17) == 0) {
      return i;
    }
  }

  // Find empty slot
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (!s_sensors[i].active) {
      memset(&s_sensors[i], 0, sizeof(SensorState));
      strncpy(s_sensors[i].mac, mac, 17);
      s_sensors[i].mac[17]   = '\0';
      s_sensors[i].active    = true;
      s_sensors[i].lastSeen  = millis();
      LOG_INFO("SENSORS", "Registered sensor %s in slot %d", mac, i);
      return i;
    }
  }

  LOG_WARN("SENSORS", "Sensor table full — cannot register %s", mac);
  return -1;
}

bool sensor_table_update_telemetry(const char* mac,
                                   uint8_t phase,
                                   float roll, float pitch,
                                   float featherAngle,
                                   float rushScore,
                                   float strokeRate,
                                   uint16_t catchSharpness,
                                   float batteryVoltage,
                                   uint32_t timestamp) {
  (void)timestamp;  // Used for logging; actual timing uses millis()
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (s_sensors[i].active && strncmp(s_sensors[i].mac, mac, 17) == 0) {
      s_sensors[i].phase          = phase;
      s_sensors[i].roll           = roll;
      s_sensors[i].pitch          = pitch;
      s_sensors[i].featherAngle   = featherAngle;
      s_sensors[i].rushScore      = rushScore;
      s_sensors[i].strokeRate     = strokeRate;
      s_sensors[i].catchSharpness = catchSharpness;
      s_sensors[i].batteryVoltage = batteryVoltage;
      s_sensors[i].lastSeen       = millis();
      return true;
    }
  }
  return false;
}

void sensor_table_age() {
  const uint32_t now = millis();
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (s_sensors[i].active && (now - s_sensors[i].lastSeen) > SENSOR_TIMEOUT_MS) {
      LOG_WARN("SENSORS", "Sensor %s timed out", s_sensors[i].mac);
      s_sensors[i].active = false;
    }
  }
}

const SensorState* sensor_table_get_all() {
  return s_sensors;
}

int sensor_table_active_count() {
  int count = 0;
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (s_sensors[i].active) count++;
  }
  return count;
}

bool sensor_table_is_registered(const char* mac) {
  for (int i = 0; i < HUB_MAX_SENSORS; i++) {
    if (s_sensors[i].active && strncmp(s_sensors[i].mac, mac, 17) == 0) {
      return true;
    }
  }
  return false;
}
