#include "espnow_hub.h"
#include "sensor_table.h"
#include "logger.h"
#include "../include/config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <string.h>

static char                  s_hubMacStr[18]     = {};
static OnTelemetryReceived   s_telemetryCb        = nullptr;
static OnStrokeSummaryReceived s_strokeCb         = nullptr;

// Pending ACK queue (simple single-entry; hub sends ACK immediately in callback)
static bool   s_pendingAck    = false;
static uint8_t s_pendingAckMac[6] = {};
static char   s_pendingAckMacStr[18] = {};

static void on_data_recv(const uint8_t* senderMac, const uint8_t* data, int len) {
  if (len < 1) return;
  const uint8_t pktType = data[0];

  switch (pktType) {
    case PKT_REGISTRATION: {
      if (len < (int)sizeof(RegistrationPacket)) return;
      const RegistrationPacket* reg = reinterpret_cast<const RegistrationPacket*>(data);

      LOG_INFO("ESPNOW", "Registration from %s (fw=%s bat=%.2fV)",
               reg->sensorMac, reg->version, reg->batteryVoltage);

      // Register in sensor table
      sensor_table_register(reg->sensorMac);

      // Add as ESP-NOW peer
      if (!esp_now_is_peer_exist(senderMac)) {
        esp_now_peer_info_t peer = {};
        memcpy(peer.peer_addr, senderMac, 6);
        peer.channel = 0;
        peer.encrypt = false;
        esp_now_add_peer(&peer);
      }

      // Queue ACK (sent in main loop to avoid blocking callback)
      memcpy(s_pendingAckMac, senderMac, 6);
      strncpy(s_pendingAckMacStr, reg->sensorMac, 17);
      s_pendingAckMacStr[17] = '\0';
      s_pendingAck = true;
      break;
    }

    case PKT_TELEMETRY: {
      if (len < (int)sizeof(TelemetryPacket)) return;
      const TelemetryPacket* pkt = reinterpret_cast<const TelemetryPacket*>(data);

      // Update sensor state table
      sensor_table_update_telemetry(pkt->mac, pkt->phase,
                                    pkt->roll, pkt->pitch,
                                    pkt->featherAngle,
                                    pkt->rushScore,
                                    pkt->strokeRate,
                                    pkt->catchSharpness,
                                    pkt->batteryVoltage,
                                    pkt->timestamp);

      if (s_telemetryCb) s_telemetryCb(pkt);
      break;
    }

    case PKT_STROKE_SUMMARY: {
      if (len < (int)sizeof(StrokeSummaryPacket)) return;
      const StrokeSummaryPacket* pkt = reinterpret_cast<const StrokeSummaryPacket*>(data);

      LOG_INFO("ESPNOW", "Stroke from %s: feather=%.1f° rush=%.2f rate=%.1fspm",
               pkt->mac, pkt->featherAngle, pkt->rushScore, pkt->strokeRate);

      if (s_strokeCb) s_strokeCb(pkt);
      break;
    }

    default:
      break;
  }
}

static void on_data_sent(const uint8_t* mac, esp_now_send_status_t status) {
  if (status != ESP_NOW_SEND_SUCCESS) {
    LOG_WARN("ESPNOW", "Send failed to %02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  }
}

bool espnow_hub_init(OnTelemetryReceived telemetryCb, OnStrokeSummaryReceived strokeCb) {
  s_telemetryCb = telemetryCb;
  s_strokeCb    = strokeCb;

  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  snprintf(s_hubMacStr, sizeof(s_hubMacStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);

  // ESP-NOW requires WiFi STA mode; channel must match connected AP
  // (WiFi.begin() must have been called first for STA+ESP-NOW coexistence)
  if (esp_now_init() != ESP_OK) {
    LOG_ERROR("ESPNOW", "esp_now_init() failed");
    return false;
  }

  esp_now_register_recv_cb(on_data_recv);
  esp_now_register_send_cb(on_data_sent);

  // Register broadcast peer
  esp_now_peer_info_t broadcastPeer = {};
  memset(broadcastPeer.peer_addr, 0xFF, 6);
  broadcastPeer.channel = 0;
  broadcastPeer.encrypt = false;
  esp_now_add_peer(&broadcastPeer);

  LOG_INFO("ESPNOW", "Hub initialized, MAC: %s", s_hubMacStr);
  return true;
}

void espnow_hub_broadcast_beacon() {
  BeaconPacket beacon = {};
  beacon.type = PKT_BEACON;
  memcpy(beacon.hubMac, s_hubMacStr, sizeof(beacon.hubMac));
  strncpy(beacon.version, FIRMWARE_VERSION, sizeof(beacon.version) - 1);
  beacon.channel   = static_cast<uint8_t>(WiFi.channel());
  beacon.timestamp = millis();

  const uint8_t broadcast[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  esp_now_send(broadcast, reinterpret_cast<const uint8_t*>(&beacon), sizeof(beacon));
}

void espnow_hub_update() {
  // Send any queued ACK
  if (s_pendingAck) {
    s_pendingAck = false;

    AckPacket ack = {};
    ack.type = PKT_ACK;
    strncpy(ack.sensorMac, s_pendingAckMacStr, 17);
    ack.sensorMac[17] = '\0';
    ack.timestamp = millis();

    esp_now_send(s_pendingAckMac, reinterpret_cast<const uint8_t*>(&ack), sizeof(ack));
    LOG_INFO("ESPNOW", "ACK sent to %s", s_pendingAckMacStr);
  }
}
