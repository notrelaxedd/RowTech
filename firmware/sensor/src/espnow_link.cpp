#include "espnow_link.h"
#include "packets.h"
#include "../include/config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <string.h>

// =============================================================================
// ESP-NOW Transport Layer (Sensor Side)
//
// Boot flow:
//   1. Init ESP-NOW in STA mode (no AP connection needed for ESP-NOW)
//   2. Register promiscuous receive callback on broadcast channel
//   3. On receiving BeaconPacket: send RegistrationPacket to hub MAC
//   4. On receiving AckPacket: transition to CONNECTED, add hub as peer
//   5. In CONNECTED state: accept send calls for telemetry/stroke packets
// =============================================================================

static LinkState  s_state         = LinkState::SEARCHING;
static uint8_t    s_hubMac[6]     = {};
static char       s_ownMacStr[18] = {};
static uint32_t   s_lastHubSeenMs = 0;
static uint32_t   s_lastRegSentMs = 0;
static bool       s_sendPending   = false;
static bool       s_sendSuccess   = false;

// Read own MAC as formatted string
static void format_mac(const uint8_t* mac, char* buf) {
  snprintf(buf, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

static void on_data_recv(const uint8_t* senderMac, const uint8_t* data, int len) {
  if (len < 1) return;
  const uint8_t pktType = data[0];

  switch (pktType) {
    case PKT_BEACON: {
      if (len < (int)sizeof(BeaconPacket)) return;
      if (s_state != LinkState::SEARCHING && s_state != LinkState::REGISTERING) return;

      const BeaconPacket* beacon = reinterpret_cast<const BeaconPacket*>(data);
      memcpy(s_hubMac, senderMac, 6);

      // Match the hub's WiFi channel so ESP-NOW sends succeed
      const uint8_t hubChannel = beacon->channel;
      esp_wifi_set_channel(hubChannel, WIFI_SECOND_CHAN_NONE);

      // Build registration reply
      RegistrationPacket reg = {};
      reg.type = PKT_REGISTRATION;
      memcpy(reg.sensorMac, s_ownMacStr, sizeof(reg.sensorMac));
      strncpy(reg.version, FIRMWARE_VERSION, sizeof(reg.version) - 1);
      reg.batteryVoltage = 0.0f;

      // Add hub as peer on the correct channel
      esp_now_peer_info_t peerInfo = {};
      memcpy(peerInfo.peer_addr, senderMac, 6);
      peerInfo.channel = hubChannel;
      peerInfo.encrypt = false;
      if (esp_now_is_peer_exist(senderMac)) {
        esp_now_mod_peer(&peerInfo);  // Update channel if peer already registered
      } else {
        esp_now_add_peer(&peerInfo);
      }

      esp_now_send(senderMac, reinterpret_cast<const uint8_t*>(&reg), sizeof(reg));
      s_state        = LinkState::REGISTERING;
      s_lastRegSentMs = millis();

      Serial.printf("[ESP-NOW] Beacon from hub %s — sent registration\n", beacon->hubMac);
      break;
    }

    case PKT_ACK: {
      if (len < (int)sizeof(AckPacket)) return;
      if (s_state != LinkState::REGISTERING) return;

      const AckPacket* ack = reinterpret_cast<const AckPacket*>(data);

      // Confirm ACK is for us
      if (strncmp(ack->sensorMac, s_ownMacStr, 17) != 0) return;

      memcpy(s_hubMac, senderMac, 6);
      s_state         = LinkState::CONNECTED;
      s_lastHubSeenMs = millis();

      Serial.printf("[ESP-NOW] Registered with hub — streaming started\n");
      break;
    }

    default:
      break;
  }
}

static void on_data_sent(const uint8_t* mac, esp_now_send_status_t status) {
  s_sendSuccess = (status == ESP_NOW_SEND_SUCCESS);
  if (!s_sendSuccess) {
    Serial.printf("[ESP-NOW] Send failed to %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  }
}

bool espnow_init() {
  // Obtain own MAC
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  format_mac(mac, s_ownMacStr);
  Serial.printf("[ESP-NOW] Own MAC: %s\n", s_ownMacStr);

  // Set WiFi to STA mode (required for ESP-NOW)
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) {
    Serial.println("[ESP-NOW] ERROR: esp_now_init() failed");
    return false;
  }

  esp_now_register_recv_cb(on_data_recv);
  esp_now_register_send_cb(on_data_sent);

  // Register broadcast peer so we can receive from hub on FF:FF:FF:FF:FF:FF
  esp_now_peer_info_t broadcastPeer = {};
  memset(broadcastPeer.peer_addr, 0xFF, 6);
  broadcastPeer.channel = 0;
  broadcastPeer.encrypt = false;
  esp_now_add_peer(&broadcastPeer);

  s_state = LinkState::SEARCHING;
  Serial.println("[ESP-NOW] Initialized — searching for hub...");
  return true;
}

void espnow_update() {
  const uint32_t now = millis();

  // In REGISTERING state: retry if no ACK within timeout
  if (s_state == LinkState::REGISTERING) {
    if (now - s_lastRegSentMs > REGISTRATION_ACK_TIMEOUT_MS) {
      Serial.println("[ESP-NOW] ACK timeout — back to SEARCHING");
      s_state = LinkState::SEARCHING;
    }
  }
}

LinkState espnow_get_state() {
  return s_state;
}

void espnow_send_telemetry(const TelemetryPacket& pkt) {
  if (s_state != LinkState::CONNECTED) return;
  esp_now_send(s_hubMac, reinterpret_cast<const uint8_t*>(&pkt), sizeof(TelemetryPacket));
  s_lastHubSeenMs = millis();  // Reset timeout on successful send attempt
}

void espnow_send_stroke_summary(const StrokeSummaryPacket& pkt) {
  if (s_state != LinkState::CONNECTED) return;
  esp_now_send(s_hubMac, reinterpret_cast<const uint8_t*>(&pkt), sizeof(StrokeSummaryPacket));
}

bool espnow_hub_timed_out() {
  if (s_state != LinkState::CONNECTED) return false;
  return (millis() - s_lastHubSeenMs) > HUB_TIMEOUT_MS;
}

void espnow_reset_to_search() {
  Serial.println("[ESP-NOW] Hub lost — re-entering SEARCHING mode");

  // Remove hub peer
  if (esp_now_is_peer_exist(s_hubMac)) {
    esp_now_del_peer(s_hubMac);
  }
  memset(s_hubMac, 0, sizeof(s_hubMac));
  s_state         = LinkState::SEARCHING;
  s_lastHubSeenMs = 0;
}
