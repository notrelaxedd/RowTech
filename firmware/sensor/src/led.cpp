#include "led.h"
#include "../include/config.h"
#include <Arduino.h>

// =============================================================================
// LED State Machine Implementation
// Non-blocking — uses millis() to drive blink patterns without delay().
// PIN_LED is active LOW: LOW = on, HIGH = off.
// =============================================================================

static LedMode  s_mode          = LedMode::OFF;
static uint32_t s_lastToggleMs  = 0;
static bool     s_ledOn         = false;

// SOS pattern: ... --- ... (3 short, 3 long, 3 short)
// Each dot = 150ms on / 150ms off, dash = 450ms on / 150ms off
// Gap between letters = 450ms off
static const uint16_t SOS_PATTERN_MS[] = {
  150, 150,   // S dot 1
  150, 150,   // S dot 2
  150, 450,   // S dot 3 + letter gap
  450, 150,   // O dash 1
  450, 150,   // O dash 2
  450, 450,   // O dash 3 + letter gap
  150, 150,   // S dot 1
  150, 150,   // S dot 2
  150, 1500,  // S dot 3 + word gap
};
static constexpr uint8_t SOS_STEPS = sizeof(SOS_PATTERN_MS) / sizeof(SOS_PATTERN_MS[0]);
static uint8_t  s_sosStep   = 0;
static bool     s_sosPhaseOn = true;  // true = LED on phase, false = LED off phase

static inline void led_write(bool on) {
  s_ledOn = on;
  digitalWrite(PIN_LED, on ? LOW : HIGH);  // Active LOW
}

void led_init() {
  pinMode(PIN_LED, OUTPUT);
  led_write(false);
}

void led_set_mode(LedMode mode) {
  s_mode         = mode;
  s_lastToggleMs = millis();
  s_sosStep      = 0;
  s_sosPhaseOn   = true;

  if (mode == LedMode::SOLID) {
    led_write(true);
  } else if (mode == LedMode::OFF) {
    led_write(false);
  }
}

void led_update() {
  const uint32_t now = millis();

  switch (s_mode) {
    case LedMode::OFF:
    case LedMode::SOLID:
      // Handled statically in led_set_mode
      break;

    case LedMode::BLINK_SLOW: {
      // 2Hz = 500ms period, 250ms on / 250ms off
      const uint32_t interval = 1000 / (LED_SEARCH_BLINK_HZ * 2);
      if (now - s_lastToggleMs >= interval) {
        s_lastToggleMs = now;
        led_write(!s_ledOn);
      }
      break;
    }

    case LedMode::BLINK_FAST: {
      // 10Hz = 100ms period, 50ms on / 50ms off
      if (now - s_lastToggleMs >= 50) {
        s_lastToggleMs = now;
        led_write(!s_ledOn);
      }
      break;
    }

    case LedMode::SOS: {
      const uint16_t duration = SOS_PATTERN_MS[s_sosStep];
      if (now - s_lastToggleMs >= duration) {
        s_lastToggleMs = now;
        // Each pair of entries: even index = on duration, odd index = off duration
        if (s_sosStep % 2 == 0) {
          // On phase completed → turn off
          led_write(false);
        } else {
          // Off phase completed → advance to next step, turn on
          s_sosStep = (s_sosStep + 1) % SOS_STEPS;
          led_write(true);
          return;
        }
        s_sosStep = (s_sosStep + 1) % SOS_STEPS;
        if (s_sosStep % 2 == 0) {
          led_write(true);
        }
      }
      break;
    }
  }
}
