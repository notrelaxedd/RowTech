#include "stroke_fsm.h"
#include "../include/config.h"
#include <Arduino.h>
#include <math.h>
#include <string.h>

// =============================================================================
// Stroke Phase FSM Implementation
//
// State transitions:
//   RECOVERY → CATCH   : accel-Z spike + gyro-Y deceleration
//   CATCH    → DRIVE   : roll within SQUARED_WINDOW_DEG of 90°
//   DRIVE    → FINISH  : roll rate on gyro-X exceeds FEATHER_RATE_THRESHOLD
//   FINISH   → RECOVERY: feathered position maintained (roll < feather threshold)
//
// Metrics are computed on the FINISH→RECOVERY transition.
// =============================================================================

static StrokePhase  s_phase = StrokePhase::RECOVERY;
static StrokeMetrics s_completedMetrics = {};
static StrokeMetrics s_liveMetrics      = {};

// --- Catch detection state ---
static uint32_t s_squareUpTimeMs  = 0;    // millis() when oar squared up (RECOVERY→squaring)
static float    s_prevGyroY       = 0.0f; // For angular deceleration calculation
static bool     s_squaredUp       = false;

// --- Finish state ---
static float    s_peakFeatherAngle = 0.0f;
static uint32_t s_finishEntryMs    = 0;

// --- Recovery state ---
static float    s_recoveryGyroYSum = 0.0f;
static uint32_t s_recoverysamples  = 0;
static uint32_t s_recoveryEntryMs  = 0;

// --- Stroke timing ---
static uint32_t s_strokeTimestamps[STROKE_RATE_INTERVALS] = {};
static uint8_t  s_strokeTimeIdx   = 0;
static uint8_t  s_strokeTimeCount = 0;

// --- Feather consistency (rolling stddev) ---
static float    s_featherHistory[FEATHER_CONSISTENCY_WINDOW] = {};
static uint8_t  s_featherHistIdx   = 0;
static uint8_t  s_featherHistCount = 0;

// Compute rolling stddev of feather history
static float compute_feather_consistency() {
  if (s_featherHistCount < 2) return 0.0f;

  float sum = 0.0f;
  const uint8_t count = s_featherHistCount;
  for (uint8_t i = 0; i < count; i++) {
    sum += s_featherHistory[i];
  }
  const float mean = sum / count;

  float variance = 0.0f;
  for (uint8_t i = 0; i < count; i++) {
    const float diff = s_featherHistory[i] - mean;
    variance += diff * diff;
  }
  return sqrtf(variance / count);
}

// Compute stroke rate from stored interval timestamps
static float compute_stroke_rate() {
  if (s_strokeTimeCount < 2) return 0.0f;

  // Find oldest and newest timestamps in circular buffer
  const uint8_t count = (s_strokeTimeCount < STROKE_RATE_INTERVALS)
                        ? s_strokeTimeCount
                        : STROKE_RATE_INTERVALS;

  float sumIntervals = 0.0f;
  uint8_t numIntervals = 0;

  // Walk back through circular buffer
  for (uint8_t i = 1; i < count; i++) {
    const uint8_t cur  = (s_strokeTimeIdx - i + STROKE_RATE_INTERVALS) % STROKE_RATE_INTERVALS;
    const uint8_t prev = (s_strokeTimeIdx - i - 1 + STROKE_RATE_INTERVALS) % STROKE_RATE_INTERVALS;
    if (s_strokeTimestamps[cur] > s_strokeTimestamps[prev]) {
      sumIntervals += (float)(s_strokeTimestamps[cur] - s_strokeTimestamps[prev]);
      numIntervals++;
    }
  }

  if (numIntervals == 0) return 0.0f;
  const float avgIntervalMs = sumIntervals / numIntervals;
  return 60000.0f / avgIntervalMs;  // Convert to SPM
}

void fsm_init() {
  s_phase = StrokePhase::RECOVERY;
  memset(&s_completedMetrics, 0, sizeof(s_completedMetrics));
  memset(&s_liveMetrics,      0, sizeof(s_liveMetrics));
  memset(s_strokeTimestamps,  0, sizeof(s_strokeTimestamps));
  memset(s_featherHistory,    0, sizeof(s_featherHistory));
  s_prevGyroY        = 0.0f;
  s_squaredUp        = false;
  s_peakFeatherAngle = 0.0f;
  s_strokeTimeIdx    = 0;
  s_strokeTimeCount  = 0;
  s_featherHistIdx   = 0;
  s_featherHistCount = 0;
}

bool fsm_update(const ImuData& imu) {
  const uint32_t nowMs          = millis();
  const float    roll           = imu.rollDeg;
  const float    accelZ         = imu.accelZ;
  const float    gyroX          = imu.gyroX;  // rad/s
  const float    gyroY          = imu.gyroY;
  const float    gyroYDelta     = gyroY - s_prevGyroY;
  s_prevGyroY = gyroY;

  bool strokeCompleted = false;

  switch (s_phase) {
    // -----------------------------------------------------------------------
    case StrokePhase::RECOVERY: {
      // Track angular velocity accumulation for rush score
      s_recoveryGyroYSum += fabsf(gyroY);
      s_recoverysamples++;

      // Detect oar squaring up (roll approaching 90°)
      if (!s_squaredUp && fabsf(roll - 90.0f) <= SQUARED_WINDOW_DEG * 2.0f) {
        s_squaredUp    = true;
        s_squareUpTimeMs = nowMs;
      }

      // RECOVERY → CATCH: accel-Z spike + angular deceleration on gyro-Y
      if (accelZ > CATCH_ACCEL_THRESHOLD && (-gyroYDelta) > CATCH_DECEL_THRESHOLD) {
        const uint16_t sharpness = s_squaredUp
                                   ? (uint16_t)(nowMs - s_squareUpTimeMs)
                                   : 0;
        s_liveMetrics.catchSharpness = sharpness;
        s_phase = StrokePhase::CATCH;

        // Reset recovery tracking
        s_squaredUp        = false;
        s_recoveryGyroYSum = 0.0f;
        s_recoverysamples  = 0;

#ifdef DEBUG_MODE
        Serial.printf("[FSM] RECOVERY→CATCH catchSharpness=%dms roll=%.1f accelZ=%.3f\n",
                      sharpness, roll, accelZ);
#endif
      }
      break;
    }

    // -----------------------------------------------------------------------
    case StrokePhase::CATCH: {
      // CATCH → DRIVE: roll within SQUARED_WINDOW_DEG of 90°
      if (fabsf(roll - 90.0f) <= SQUARED_WINDOW_DEG) {
        s_phase = StrokePhase::DRIVE;
#ifdef DEBUG_MODE
        Serial.printf("[FSM] CATCH→DRIVE roll=%.1f\n", roll);
#endif
      }
      break;
    }

    // -----------------------------------------------------------------------
    case StrokePhase::DRIVE: {
      // DRIVE → FINISH: roll rate on gyro-X exceeds feather threshold
      if (fabsf(gyroX) > FEATHER_RATE_THRESHOLD) {
        s_phase            = StrokePhase::FINISH;
        s_peakFeatherAngle = fabsf(roll);
        s_finishEntryMs    = nowMs;

        // Record stroke timestamp for rate calculation
        s_strokeTimestamps[s_strokeTimeIdx] = nowMs;
        s_strokeTimeIdx = (s_strokeTimeIdx + 1) % STROKE_RATE_INTERVALS;
        if (s_strokeTimeCount < STROKE_RATE_INTERVALS) s_strokeTimeCount++;

#ifdef DEBUG_MODE
        Serial.printf("[FSM] DRIVE→FINISH roll=%.1f gyroX=%.3f rad/s\n", roll, gyroX);
#endif
      }
      break;
    }

    // -----------------------------------------------------------------------
    case StrokePhase::FINISH: {
      // Track peak feather angle during finish
      const float absRoll = fabsf(roll);
      if (absRoll > s_peakFeatherAngle &&
          absRoll >= FEATHER_ANGLE_MIN_DEG && absRoll <= FEATHER_ANGLE_MAX_DEG) {
        s_peakFeatherAngle = absRoll;
      }
      s_liveMetrics.featherAngle = s_peakFeatherAngle;

      // FINISH → RECOVERY: roll rate has fallen off (feathering complete)
      // Detect by gyro-X returning below threshold — oar now flat/feathered
      if (fabsf(gyroX) < FEATHER_RATE_THRESHOLD * 0.3f) {
        // Compute all metrics for this stroke
        const float strokeRate = compute_stroke_rate();

        // Rush score: mean angular velocity during recovery, normalized to SPM
        float rushScore = 0.0f;
        if (s_recoverysamples > 0 && strokeRate > 0.0f) {
          const float meanAngVel = (s_recoveryGyroYSum / s_recoverysamples) * (180.0f / M_PI);
          rushScore = (meanAngVel * RUSH_NORMALIZATION_FACTOR * strokeRate / 30.0f);
          // Clamp to 0–10
          rushScore = fminf(fmaxf(rushScore, 0.0f), 10.0f);
        }

        // Update feather history for consistency
        if (s_peakFeatherAngle >= FEATHER_ANGLE_MIN_DEG) {
          s_featherHistory[s_featherHistIdx] = s_peakFeatherAngle;
          s_featherHistIdx = (s_featherHistIdx + 1) % FEATHER_CONSISTENCY_WINDOW;
          if (s_featherHistCount < FEATHER_CONSISTENCY_WINDOW) s_featherHistCount++;
        }

        // Populate completed metrics
        s_completedMetrics.featherAngle       = s_peakFeatherAngle;
        s_completedMetrics.featherConsistency = compute_feather_consistency();
        s_completedMetrics.rushScore          = rushScore;
        s_completedMetrics.catchSharpness     = s_liveMetrics.catchSharpness;
        s_completedMetrics.strokeRate         = strokeRate;

        // Update live metrics to match
        s_liveMetrics = s_completedMetrics;

        s_phase            = StrokePhase::RECOVERY;
        s_recoveryEntryMs  = nowMs;
        s_recoveryGyroYSum = 0.0f;
        s_recoverysamples  = 0;
        s_peakFeatherAngle = 0.0f;
        strokeCompleted    = true;

#ifdef DEBUG_MODE
        Serial.printf("[FSM] FINISH→RECOVERY feather=%.1f° rush=%.2f rate=%.1fspm catch=%dms\n",
                      s_completedMetrics.featherAngle,
                      s_completedMetrics.rushScore,
                      s_completedMetrics.strokeRate,
                      s_completedMetrics.catchSharpness);
#endif
      }
      break;
    }
  }

  return strokeCompleted;
}

StrokePhase fsm_get_phase() {
  return s_phase;
}

const StrokeMetrics& fsm_get_stroke_metrics() {
  return s_completedMetrics;
}

const StrokeMetrics& fsm_get_live_metrics() {
  return s_liveMetrics;
}
