#include "ws_server.h"
#include "logger.h"
#include <WebSocketsServer.h>
#include <Arduino.h>
#include <stdio.h>

// WebSocket server on port 81.
// Port 80 is taken by the captive portal when active; 81 is the standard WS port.
static WebSocketsServer s_ws(81);

static void on_ws_event(uint8_t num, WStype_t type,
                        uint8_t* payload, size_t /*len*/) {
  switch (type) {
    case WStype_CONNECTED:
      LOG_INFO("WS", "Client %u connected from %u.%u.%u.%u",
               num,
               s_ws.remoteIP(num)[0], s_ws.remoteIP(num)[1],
               s_ws.remoteIP(num)[2], s_ws.remoteIP(num)[3]);
      // Send a hello so the browser knows the connection is live
      s_ws.sendTXT(num, "{\"type\":\"hello\",\"device\":\"RowTech Hub\"}");
      break;

    case WStype_DISCONNECTED:
      LOG_INFO("WS", "Client %u disconnected", num);
      break;

    case WStype_ERROR:
      LOG_WARN("WS", "Client %u error", num);
      break;

    default:
      break;
  }
}

void ws_server_begin() {
  s_ws.begin();
  s_ws.onEvent(on_ws_event);
  LOG_INFO("WS", "WebSocket server started on port 81");
  LOG_INFO("WS", "Connect browser to ws://<hub-ip>:81 or ws://rowtech.local:81");
}

void ws_server_loop() {
  s_ws.loop();
}

void ws_server_push(const char* mac,
                    uint8_t  phase,
                    float    roll,
                    float    pitch,
                    float    featherAngle,
                    float    rushScore,
                    float    strokeRate,
                    uint16_t catchSharpness,
                    float    batteryVoltage,
                    uint32_t timestamp) {
  if (s_ws.connectedClients() == 0) return;

  // Stack-allocated buffer — no heap allocation in the hot path.
  char buf[256];
  const int n = snprintf(buf, sizeof(buf),
    "{\"mac\":\"%s\",\"phase\":%u"
    ",\"roll\":%.2f,\"pitch\":%.2f"
    ",\"featherAngle\":%.2f,\"rushScore\":%.2f"
    ",\"strokeRate\":%.2f,\"catchSharpness\":%u"
    ",\"batteryVoltage\":%.3f,\"timestamp\":%lu}",
    mac, (unsigned)phase,
    (double)roll, (double)pitch,
    (double)featherAngle, (double)rushScore,
    (double)strokeRate, (unsigned)catchSharpness,
    (double)batteryVoltage, (unsigned long)timestamp);

  if (n > 0 && n < (int)sizeof(buf)) {
    s_ws.broadcastTXT(buf, (size_t)n);
  }
}

int ws_server_client_count() {
  return s_ws.connectedClients();
}
