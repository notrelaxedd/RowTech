#pragma once
#include <stdint.h>
#include <stdbool.h>

// =============================================================================
// IMU Module — MPU-6050 via I2C + Mahony Complementary Filter
// =============================================================================

struct ImuData {
  float rollDeg;    // Roll angle (degrees)  — oar feather angle
  float pitchDeg;   // Pitch angle (degrees) — oar vertical angle
  float yawDeg;     // Yaw angle (degrees)   — not primary metric but available

  // Raw gyro in rad/s (calibration bias removed)
  float gyroX;
  float gyroY;
  float gyroZ;

  // Raw accel in g (calibration bias removed, gravity NOT removed)
  float accelX;
  float accelY;
  float accelZ;
};

// Initialize I2C and MPU-6050. Returns false if sensor not found.
bool imu_init();

// Collect calibration samples on a flat, still surface.
// Blocks for IMU_CALIBRATION_DURATION_MS milliseconds.
void imu_calibrate();

// Read sensor, apply Mahony filter, update internal state.
// Call at LOOP_RATE_HZ (200Hz).
void imu_update();

// Returns a const reference to the last computed IMU state.
const ImuData& imu_get();

// Read battery voltage from ADC (volts)
float imu_read_battery_voltage();
