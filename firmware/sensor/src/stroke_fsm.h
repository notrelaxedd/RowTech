#pragma once
#include <stdint.h>
#include "imu.h"

// =============================================================================
// Stroke Phase FSM
// Detects rowing stroke phases from IMU data.
// =============================================================================

enum class StrokePhase : uint8_t {
  RECOVERY = 0,
  CATCH    = 1,
  DRIVE    = 2,
  FINISH   = 3,
};

struct StrokeMetrics {
  float    featherAngle;        // Peak roll degrees during FINISH
  float    featherConsistency;  // Rolling stddev of featherAngle over last N strokes
  float    rushScore;           // 0.0–10.0, normalized angular velocity during RECOVERY
  uint16_t catchSharpness;      // ms from square-up to accel-Z spike
  float    strokeRate;          // Strokes per minute from last 4 intervals
};

// Initialize FSM state
void fsm_init();

// Feed latest IMU data into FSM. Call at LOOP_RATE_HZ.
// Returns true when a stroke has completed (FINISH→RECOVERY), indicating
// that fsm_get_stroke_metrics() has fresh data.
bool fsm_update(const ImuData& imu);

// Current phase
StrokePhase fsm_get_phase();

// Metrics from the most recently completed stroke.
// Only valid after fsm_update() returns true.
const StrokeMetrics& fsm_get_stroke_metrics();

// Metrics updated in real-time (featherAngle from current FINISH, etc.)
// for use in telemetry packets even mid-stroke.
const StrokeMetrics& fsm_get_live_metrics();
