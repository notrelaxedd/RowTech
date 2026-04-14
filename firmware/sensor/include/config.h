#pragma once

// =============================================================================
// RowTech Sensor Configuration
// All tunable thresholds are documented here. Adjust on-water using serial
// monitor output — see docs/firmware-tuning.md for guidance.
// =============================================================================

// Firmware version reported in registration packets
#define FIRMWARE_VERSION "1.0.0"

// -----------------------------------------------------------------------------
// Hardware pin assignments (Wemos Lolin32 Lite)
// -----------------------------------------------------------------------------
#define PIN_SDA         19      // I2C SDA — connect MPU-6050 SDA here
#define PIN_SCL         23      // I2C SCL — connect MPU-6050 SCL here
#define PIN_LED         22      // Onboard LED (active LOW on Lolin32 Lite)
#define PIN_BATTERY_ADC 35      // ADC pin for battery voltage divider (100k/100k)

// Battery voltage divider ratio: Vbat -- 100k -- ADC -- 100k -- GND
// ADC reads 0–3.3V, actual voltage = ADC * BATTERY_DIVIDER_RATIO
#define BATTERY_DIVIDER_RATIO   2.0f
#define BATTERY_ADC_REF_V       3.3f
#define BATTERY_ADC_RESOLUTION  4095.0f

// -----------------------------------------------------------------------------
// IMU calibration
// -----------------------------------------------------------------------------
// Duration (ms) to average gyro/accel bias on flat surface at boot
#define IMU_CALIBRATION_DURATION_MS   2000
// Number of samples to collect during calibration
#define IMU_CALIBRATION_SAMPLES       400
// MPU-6050 I2C address (AD0 low = 0x68, AD0 high = 0x69)
#define MPU6050_I2C_ADDR              0x68

// -----------------------------------------------------------------------------
// Mahony complementary filter
// -----------------------------------------------------------------------------
// Higher Kp = trusts accelerometer more (faster correction, more noise)
// Lower Kp  = trusts gyro more (slower drift correction, smoother)
#define MAHONY_KP   0.5f
#define MAHONY_KI   0.0f

// -----------------------------------------------------------------------------
// Loop timing
// -----------------------------------------------------------------------------
// Main IMU + FSM loop rate in Hz (max reliable rate for MPU-6050 over I2C)
#define LOOP_RATE_HZ              200
#define LOOP_INTERVAL_US          (1000000 / LOOP_RATE_HZ)   // 5000 µs

// Telemetry packet transmit interval (ms)
#define TELEMETRY_INTERVAL_MS     50    // 20 packets/sec to hub

// -----------------------------------------------------------------------------
// Stroke phase FSM thresholds
// All values determined empirically; tune on water with DEBUG_MODE=1.
// -----------------------------------------------------------------------------

// CATCH detection:
// accel-Z (vertical) spike must exceed this value (g units, raw 16-bit / 16384.0)
// Typical catch impact: 0.8–1.5g spike above gravity baseline
#define CATCH_ACCEL_THRESHOLD         1.2f    // g above baseline

// Angular deceleration on gyro-Y (rad/s per sample) must exceed this magnitude
// at the same time as the accel spike to confirm catch (not just water chop)
#define CATCH_DECEL_THRESHOLD         0.08f   // rad/s per 5ms sample

// DRIVE detection:
// Oar is considered "squared" when roll angle is within this window of the
// reference square angle (90° = blade perpendicular to water surface)
#define SQUARED_WINDOW_DEG            8.0f    // ±8° from 90°

// FINISH detection:
// Feathering begins when roll rate on gyro-X exceeds this threshold (rad/s)
// Typical feather speed: 150–300 deg/s = 2.6–5.2 rad/s
#define FEATHER_RATE_THRESHOLD        2.0f    // rad/s

// RECOVERY — rush detection:
// Angular velocity (rad/s) on gyro-Y during recovery, above which the stroke
// is considered "rushed". rushScore = mean_angular_vel / stroke_rate (normalized)
// Rush score 0–10; above 6 = noticeably rushed
#define RUSH_NORMALIZATION_FACTOR     0.05f

// Feather angle considered "valid" range (degrees)
// Angles outside this range are discarded as sensor noise
#define FEATHER_ANGLE_MIN_DEG         30.0f
#define FEATHER_ANGLE_MAX_DEG         90.0f

// Feather consistency: rolling window of strokes for stddev calculation
#define FEATHER_CONSISTENCY_WINDOW    10

// Stroke rate: number of prior stroke intervals used for SPM calculation
#define STROKE_RATE_INTERVALS         4

// -----------------------------------------------------------------------------
// ESP-NOW registration
// -----------------------------------------------------------------------------
// Time to wait for hub acknowledgment before retrying registration (ms)
#define REGISTRATION_ACK_TIMEOUT_MS   2000

// Interval between registration beacons broadcast by hub (hub side: 500ms)
// Sensor listens passively — this is just for documentation parity
#define HUB_BEACON_INTERVAL_MS        500

// Hub is considered lost if no telemetry ACK or data within this period (ms)
// Will trigger re-entry into registration mode
#define HUB_TIMEOUT_MS                5000

// LED blink rate while searching for hub (Hz)
#define LED_SEARCH_BLINK_HZ           2

// -----------------------------------------------------------------------------
// Packet type identifiers (must match hub firmware)
// -----------------------------------------------------------------------------
#define PACKET_TYPE_BEACON            0x01
#define PACKET_TYPE_REGISTRATION      0x02
#define PACKET_TYPE_ACK               0x03
#define PACKET_TYPE_TELEMETRY         0x04
#define PACKET_TYPE_STROKE_SUMMARY    0x05
