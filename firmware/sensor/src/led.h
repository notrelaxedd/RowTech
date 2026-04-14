#pragma once
#include <stdint.h>

// =============================================================================
// LED State Machine
// Controls the onboard LED to communicate sensor status.
// PIN_LED is active LOW on the Wemos Lolin32 Lite.
// =============================================================================

enum class LedMode {
  OFF,          // LED off
  SOLID,        // LED constantly on — registered and streaming
  BLINK_SLOW,   // 2Hz blink — searching for hub
  BLINK_FAST,   // 10Hz blink — ESP-NOW init failure
  SOS,          // SOS pattern — IMU not detected (fatal)
};

void led_init();
void led_set_mode(LedMode mode);
void led_update();  // Call every loop iteration — drives non-blocking blink state machine
