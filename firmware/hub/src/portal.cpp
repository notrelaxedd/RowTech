#include "portal.h"
#include "wifi_mgr.h"
#include "logger.h"
#include "../include/config.h"
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>

static WebServer s_server(80);
static DNSServer s_dns;

static const char PORTAL_HTML[] PROGMEM = R"rawhtml(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RowTech Setup</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #1e293b; border-radius: 12px; padding: 2rem; width: 100%; max-width: 360px; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; color: #38bdf8; }
  p  { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
  label { display: block; font-size: 0.75rem; font-weight: 600; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  input { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px;
          color: #f1f5f9; padding: 0.75rem; font-size: 1rem; margin-bottom: 1rem; outline: none; }
  input:focus { border-color: #38bdf8; }
  button { width: 100%; background: #0ea5e9; color: #fff; border: none; border-radius: 8px;
           padding: 0.875rem; font-size: 1rem; font-weight: 600; cursor: pointer; }
  button:active { background: #0284c7; }
</style>
</head>
<body>
<div class="card">
  <h1>RowTech</h1>
  <p>Enter your WiFi credentials to connect the hub to your network.</p>
  <form method="POST" action="/save">
    <label>Network Name (SSID)</label>
    <input type="text" name="ssid" placeholder="My Network" autocomplete="off" required>
    <label>Password</label>
    <input type="password" name="pass" placeholder="Password">
    <button type="submit">Connect &amp; Save</button>
  </form>
</div>
</body>
</html>
)rawhtml";

static const char SAVED_HTML[] PROGMEM = R"rawhtml(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RowTech Setup</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #1e293b; border-radius: 12px; padding: 2rem; text-align: center; max-width: 360px; }
  h1 { color: #22c55e; font-size: 1.5rem; margin-bottom: 0.5rem; }
  p  { color: #94a3b8; }
</style>
</head>
<body>
<div class="card">
  <h1>Saved!</h1>
  <p>Hub is restarting and will connect to your network. This page will close.</p>
</div>
</body>
</html>
)rawhtml";

void portal_start() {
  LOG_INFO("PORTAL", "Starting captive portal AP: %s", PORTAL_SSID);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(PORTAL_SSID);

  const IPAddress apIP(192, 168, 4, 1);
  WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));

  // DNS catch-all — redirect all domains to portal IP
  s_dns.start(53, "*", apIP);

  // Serve portal page
  s_server.on("/", HTTP_GET, []() {
    s_server.send_P(200, "text/html", PORTAL_HTML);
  });

  // Handle iOS/Android captive portal detection URLs
  s_server.on("/generate_204", HTTP_GET, []() {
    s_server.sendHeader("Location", "http://192.168.4.1/", true);
    s_server.send(302, "text/plain", "");
  });
  s_server.on("/hotspot-detect.html", HTTP_GET, []() {
    s_server.sendHeader("Location", "http://192.168.4.1/", true);
    s_server.send(302, "text/plain", "");
  });
  s_server.on("/connecttest.txt", HTTP_GET, []() {
    s_server.sendHeader("Location", "http://192.168.4.1/", true);
    s_server.send(302, "text/plain", "");
  });

  // Save credentials endpoint
  s_server.on("/save", HTTP_POST, []() {
    const String ssid = s_server.arg("ssid");
    const String pass = s_server.arg("pass");

    if (ssid.length() == 0) {
      s_server.send(400, "text/plain", "SSID required");
      return;
    }

    s_server.send_P(200, "text/html", SAVED_HTML);
    delay(1000);  // Let page render before restart

    wifi_mgr_save_credentials(ssid.c_str(), pass.c_str());
    LOG_INFO("PORTAL", "Credentials saved, restarting...");
    delay(500);
    ESP.restart();
  });

  // Catch-all redirect for unknown paths
  s_server.onNotFound([]() {
    s_server.sendHeader("Location", "http://192.168.4.1/", true);
    s_server.send(302, "text/plain", "");
  });

  s_server.begin();
  LOG_INFO("PORTAL", "Portal running at http://%s", PORTAL_IP);

  // Block in portal until reboot (triggered by /save handler)
  while (true) {
    s_dns.processNextRequest();
    s_server.handleClient();
    delay(1);
  }
}
