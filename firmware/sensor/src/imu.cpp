#include "imu.h"
#include "../include/config.h"
#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <math.h>

// =============================================================================
// IMU Implementation — MPU-6050 + Mahony Complementary Filter
//
// Mahony filter reference:
//   Mahony et al. "Complementary filter design on the Special Orthogonal Group SO(3)"
//   IEEE CDC 2005. Implementation adapted from open-source reference.
// =============================================================================

static MPU6050 mpu;
static ImuData s_data = {};

// Calibration biases (mean of stationary samples)
static float s_gyroBiasX = 0.0f;
static float s_gyroBiasY = 0.0f;
static float s_gyroBiasZ = 0.0f;
static float s_accelBiasX = 0.0f;
static float s_accelBiasY = 0.0f;
// Z bias not removed — gravity component handled by filter

// Mahony filter state — quaternion
static float q0 = 1.0f, q1 = 0.0f, q2 = 0.0f, q3 = 0.0f;
// Integral error terms
static float integralFBx = 0.0f, integralFBy = 0.0f, integralFBz = 0.0f;

static constexpr float DT = 1.0f / LOOP_RATE_HZ;  // 0.005s
static constexpr float TWO_KP = 2.0f * MAHONY_KP;
static constexpr float TWO_KI = 2.0f * MAHONY_KI;

// MPU-6050 raw → SI conversion
static constexpr float GYRO_SCALE  = 1.0f / 131.0f;   // ±250 dps range → rad/s (* π/180)
static constexpr float ACCEL_SCALE = 1.0f / 16384.0f; // ±2g range → g

static void mahony_update(float gx, float gy, float gz,
                          float ax, float ay, float az) {
  float recipNorm;
  float halfvx, halfvy, halfvz;
  float halfex, halfey, halfez;
  float qa, qb, qc;

  // Normalise accelerometer measurement
  const float accelNorm = sqrtf(ax * ax + ay * ay + az * az);
  if (accelNorm < 0.001f) return;  // discard degenerate readings
  const float rn = 1.0f / accelNorm;
  ax *= rn;
  ay *= rn;
  az *= rn;

  // Estimated direction of gravity from current quaternion
  halfvx =  q1 * q3 - q0 * q2;
  halfvy =  q0 * q1 + q2 * q3;
  halfvz =  q0 * q0 - 0.5f + q3 * q3;

  // Error = cross product between estimated and measured direction of gravity
  halfex = ay * halfvz - az * halfvy;
  halfey = az * halfvx - ax * halfvz;
  halfez = ax * halfvy - ay * halfvx;

  // Integral feedback
  if (TWO_KI > 0.0f) {
    integralFBx += TWO_KI * halfex * DT;
    integralFBy += TWO_KI * halfey * DT;
    integralFBz += TWO_KI * halfez * DT;
    gx += integralFBx;
    gy += integralFBy;
    gz += integralFBz;
  }

  // Proportional feedback
  gx += TWO_KP * halfex;
  gy += TWO_KP * halfey;
  gz += TWO_KP * halfez;

  // Integrate rate of change of quaternion
  gx *= 0.5f * DT;
  gy *= 0.5f * DT;
  gz *= 0.5f * DT;
  qa = q0;
  qb = q1;
  qc = q2;
  q0 += (-qb * gx - qc * gy - q3 * gz);
  q1 += ( qa * gx + qc * gz - q3 * gy);
  q2 += ( qa * gy - qb * gz + q3 * gx);
  q3 += ( qa * gz + qb * gy - qc * gx);

  // Normalise quaternion
  recipNorm = 1.0f / sqrtf(q0 * q0 + q1 * q1 + q2 * q2 + q3 * q3);
  q0 *= recipNorm;
  q1 *= recipNorm;
  q2 *= recipNorm;
  q3 *= recipNorm;
}

bool imu_init() {
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);  // 400kHz fast mode

  mpu.initialize();
  mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_250);
  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_2);
  mpu.setDLPFMode(MPU6050_DLPF_BW_42);  // 42Hz LPF for noise reduction

  if (!mpu.testConnection()) {
    Serial.printf("[IMU] ERROR: MPU-6050 not found at I2C addr 0x%02X\n", MPU6050_I2C_ADDR);
    return false;
  }

  Serial.printf("[IMU] MPU-6050 detected (WHO_AM_I: 0x%02X)\n", mpu.getDeviceID());
  return true;
}

void imu_calibrate() {
  Serial.printf("[IMU] Calibrating — keep sensor flat and still for %dms...\n",
                IMU_CALIBRATION_DURATION_MS);

  double sumGX = 0, sumGY = 0, sumGZ = 0;
  double sumAX = 0, sumAY = 0;
  int16_t ax, ay, az, gx, gy, gz;
  const int samples = IMU_CALIBRATION_SAMPLES;

  for (int i = 0; i < samples; i++) {
    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
    sumGX += gx;
    sumGY += gy;
    sumGZ += gz;
    sumAX += ax;
    sumAY += ay;
    delay(IMU_CALIBRATION_DURATION_MS / samples);
  }

  s_gyroBiasX  = (float)(sumGX / samples) * GYRO_SCALE * (M_PI / 180.0f);
  s_gyroBiasY  = (float)(sumGY / samples) * GYRO_SCALE * (M_PI / 180.0f);
  s_gyroBiasZ  = (float)(sumGZ / samples) * GYRO_SCALE * (M_PI / 180.0f);
  s_accelBiasX = (float)(sumAX / samples) * ACCEL_SCALE;
  s_accelBiasY = (float)(sumAY / samples) * ACCEL_SCALE;

  Serial.printf("[IMU] Calibration done. Gyro bias: %.4f %.4f %.4f rad/s\n",
                s_gyroBiasX, s_gyroBiasY, s_gyroBiasZ);
  Serial.printf("[IMU] Accel bias: %.4f %.4f g\n", s_accelBiasX, s_accelBiasY);
}

void imu_update() {
  int16_t ax16, ay16, az16, gx16, gy16, gz16;
  mpu.getMotion6(&ax16, &ay16, &az16, &gx16, &gy16, &gz16);

  // Convert to SI, remove bias
  const float gx = (float)gx16 * GYRO_SCALE * (M_PI / 180.0f) - s_gyroBiasX;
  const float gy = (float)gy16 * GYRO_SCALE * (M_PI / 180.0f) - s_gyroBiasY;
  const float gz = (float)gz16 * GYRO_SCALE * (M_PI / 180.0f) - s_gyroBiasZ;
  const float ax = (float)ax16 * ACCEL_SCALE - s_accelBiasX;
  const float ay = (float)ay16 * ACCEL_SCALE - s_accelBiasY;
  const float az = (float)az16 * ACCEL_SCALE;  // Keep gravity in Z

  // Store calibrated sensor readings
  s_data.gyroX  = gx;
  s_data.gyroY  = gy;
  s_data.gyroZ  = gz;
  s_data.accelX = ax;
  s_data.accelY = ay;
  s_data.accelZ = az;

  // Run Mahony filter
  mahony_update(gx, gy, gz, ax, ay, az);

  // Derive Euler angles from quaternion
  // Roll: rotation around X axis (oar feather angle)
  s_data.rollDeg  = atan2f(2.0f * (q0 * q1 + q2 * q3),
                            1.0f - 2.0f * (q1 * q1 + q2 * q2)) * (180.0f / M_PI);
  // Pitch: rotation around Y axis (oar vertical angle)
  const float sinp = 2.0f * (q0 * q2 - q3 * q1);
  s_data.pitchDeg = (fabsf(sinp) >= 1.0f)
                    ? copysignf(90.0f, sinp)
                    : asinf(sinp) * (180.0f / M_PI);
  // Yaw: rotation around Z axis
  s_data.yawDeg   = atan2f(2.0f * (q0 * q3 + q1 * q2),
                            1.0f - 2.0f * (q2 * q2 + q3 * q3)) * (180.0f / M_PI);
}

const ImuData& imu_get() {
  return s_data;
}

float imu_read_battery_voltage() {
  // Average 16 ADC samples to reduce noise
  uint32_t sum = 0;
  for (int i = 0; i < 16; i++) {
    sum += analogRead(PIN_BATTERY_ADC);
    delayMicroseconds(100);
  }
  const float adcAvg = (float)(sum / 16);
  return (adcAvg / BATTERY_ADC_RESOLUTION) * BATTERY_ADC_REF_V * BATTERY_DIVIDER_RATIO;
}
