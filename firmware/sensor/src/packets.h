#pragma once
#include <stdint.h>

// =============================================================================
// RowTech Packet Definitions
// Shared between sensor and hub firmware — keep in sync.
// All structs are packed to guarantee consistent over-the-air serialization.
// =============================================================================

// Packet type byte — first byte of every ESP-NOW payload
enum PacketType : uint8_t {
  PKT_BEACON         = 0x01,  // Hub → broadcast: discovery beacon
  PKT_REGISTRATION   = 0x02,  // Sensor → hub: registration request
  PKT_ACK            = 0x03,  // Hub → sensor: registration acknowledged
  PKT_TELEMETRY      = 0x04,  // Sensor → hub: live telemetry (50ms)
  PKT_STROKE_SUMMARY = 0x05,  // Sensor → hub: completed stroke summary
};

// Hub broadcasts this on FF:FF:FF:FF:FF:FF every 500ms
struct __attribute__((packed)) BeaconPacket {
  uint8_t  type;           // PKT_BEACON
  char     hubMac[18];     // Hub MAC address string "AA:BB:CC:DD:EE:FF\0"
  char     version[8];     // Hub firmware version "1.0.0\0"
  uint32_t timestamp;      // millis() on hub at send time
};

// Sensor sends this to hub MAC on receiving a beacon
struct __attribute__((packed)) RegistrationPacket {
  uint8_t  type;           // PKT_REGISTRATION
  char     sensorMac[18];  // This sensor's MAC address
  char     version[8];     // Sensor firmware version
  float    batteryVoltage; // Current battery voltage (V)
};

// Hub sends this back to sensor MAC to complete registration
struct __attribute__((packed)) AckPacket {
  uint8_t  type;           // PKT_ACK
  char     sensorMac[18];  // MAC of the sensor being acknowledged
  uint32_t timestamp;      // Hub millis() at ack time
};

// Sensor sends this every 50ms to hub MAC after registration
struct __attribute__((packed)) TelemetryPacket {
  uint8_t  type;            // PKT_TELEMETRY
  char     mac[18];         // This sensor's MAC address
  uint8_t  phase;           // StrokePhase enum value (0=RECOVERY,1=CATCH,2=DRIVE,3=FINISH)
  float    roll;            // Roll angle (degrees) — oar feather angle
  float    pitch;           // Pitch angle (degrees) — oar vertical angle
  float    featherAngle;    // Peak feather angle from last FINISH phase (degrees)
  float    rushScore;       // Rush score 0.0–10.0 from last RECOVERY
  float    strokeRate;      // Strokes per minute from last 4 intervals
  uint16_t catchSharpness;  // ms from square-up to catch accel spike (last stroke)
  float    batteryVoltage;  // Battery voltage (V)
  uint32_t timestamp;       // millis() at packet creation
};

// Sensor sends this once per stroke at FINISH→RECOVERY transition
struct __attribute__((packed)) StrokeSummaryPacket {
  uint8_t  type;                // PKT_STROKE_SUMMARY
  char     mac[18];             // This sensor's MAC address
  float    featherAngle;        // Peak roll during FINISH (degrees)
  float    featherConsistency;  // Rolling stddev of featherAngle over last 10 strokes
  float    rushScore;           // Rush score 0.0–10.0 for this recovery
  uint16_t catchSharpness;      // ms from square-up to accel-Z spike
  float    strokeRate;          // SPM computed from last 4 stroke intervals
  uint32_t timestamp;           // millis() at stroke completion
};
