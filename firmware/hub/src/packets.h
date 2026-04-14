#pragma once
#include <stdint.h>

// =============================================================================
// RowTech Packet Definitions (Hub copy — keep in sync with sensor/src/packets.h)
// =============================================================================

enum PacketType : uint8_t {
  PKT_BEACON         = 0x01,
  PKT_REGISTRATION   = 0x02,
  PKT_ACK            = 0x03,
  PKT_TELEMETRY      = 0x04,
  PKT_STROKE_SUMMARY = 0x05,
};

struct __attribute__((packed)) BeaconPacket {
  uint8_t  type;
  char     hubMac[18];
  char     version[8];
  uint8_t  channel;    // Hub's current WiFi channel — sensor must match this
  uint32_t timestamp;
};

struct __attribute__((packed)) RegistrationPacket {
  uint8_t  type;
  char     sensorMac[18];
  char     version[8];
  float    batteryVoltage;
};

struct __attribute__((packed)) AckPacket {
  uint8_t  type;
  char     sensorMac[18];
  uint32_t timestamp;
};

struct __attribute__((packed)) TelemetryPacket {
  uint8_t  type;
  char     mac[18];
  uint8_t  phase;
  float    roll;
  float    pitch;
  float    featherAngle;
  float    rushScore;
  float    strokeRate;
  uint16_t catchSharpness;
  float    batteryVoltage;
  uint32_t timestamp;
};

struct __attribute__((packed)) StrokeSummaryPacket {
  uint8_t  type;
  char     mac[18];
  float    featherAngle;
  float    featherConsistency;
  float    rushScore;
  uint16_t catchSharpness;
  float    strokeRate;
  uint32_t timestamp;
};
