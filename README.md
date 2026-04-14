# RowTech

Real-time oar positioning sensor system for 8+ sweep rowing boats.

**System:**
- 8 × ESP32 oar sensors (MAC-identified) → ESP-NOW → 1 × ESP32 hub → HTTPS → Vercel → Supabase → Next.js dashboard

---

## Hardware Bill of Materials

| Qty | Item | Role |
|-----|------|------|
| 8   | Wemos Lolin32 Lite | Oar sensor (one per oar) |
| 8   | MPU-6050 module | IMU (one per sensor) |
| 1   | Wemos Lolin32 Lite | Cox box hub |
| 8   | 3.7V LiPo battery | Sensor power |
| 1   | 3.7V LiPo battery | Hub power |

**Sensor wiring (per unit):**
```
MPU-6050 SDA → GPIO 23
MPU-6050 SCL → GPIO 19
MPU-6050 VCC → 3.3V
MPU-6050 GND → GND
Battery +    → Battery ADC pin (GPIO 35) via 100kΩ/100kΩ divider
```

---

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/rowtech.git
cd rowtech
npm install
```

### 2. Supabase Setup

1. Create a Supabase project at supabase.com
2. Copy your Project URL, anon key, and service role key
3. Run the migration:
   ```bash
   cd dashboard
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   # Optionally load seed data for development:
   npx supabase db reset
   ```

### 3. Environment Variables

```bash
cp dashboard/.env.local.example dashboard/.env.local
# Edit .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   HUB_SECRET (generate: openssl rand -hex 32)
#   NEXT_PUBLIC_APP_URL
```

### 4. Local Development

```bash
npm run dev
# Dashboard at http://localhost:3000
```

### 5. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from dashboard/ directory
cd dashboard
vercel deploy --prod

# Set environment variables in Vercel Dashboard:
# Project > Settings > Environment Variables
# Add all variables from .env.local.example
```

---

## Firmware

### Prerequisites

Install PlatformIO:
```bash
pip install platformio
```

Or use the [PlatformIO IDE extension](https://platformio.org/platformio-ide) for VS Code.

### Flashing Sensor Firmware (all 8 oar units)

Each sensor is **identical** — no hardcoded seat ID. The MAC address is the identity.

```bash
cd firmware/sensor

# Edit include/config.h if you need to change I2C pins or thresholds.
# No other changes required for standard hardware.

# Flash via USB:
pio run --target upload --environment lolin32_lite

# Monitor serial output:
pio device monitor --baud 115200
```

Expected boot output:
```
[BOOT] RowTech Sensor v1.0.0
[IMU] MPU-6050 detected (WHO_AM_I: 0x68)
[IMU] Calibrating — keep sensor flat and still for 2000ms...
[IMU] Calibration done. Gyro bias: 0.0012 -0.0003 0.0008 rad/s
[ESP-NOW] Own MAC: AA:BB:CC:DD:EE:FF
[BOOT] Waiting for hub registration...
[ESP-NOW] Beacon from hub 11:22:33:44:55:66 — sent registration
[ESP-NOW] Registered with hub — streaming started
```

### Flashing Hub Firmware

```bash
cd firmware/hub

# IMPORTANT: Before flashing, edit include/config.h:
#   1. Set VERCEL_BASE_URL to your deployed Vercel URL
#   2. Set HUB_SECRET to match the HUB_SECRET env var in Vercel
#   OR use build_flags in platformio.ini:
#      build_flags = -DHUB_SECRET='"your-secret-here"' -DVERCEL_BASE_URL='"https://your-app.vercel.app"'

pio run --target upload --environment lolin32_lite

# Monitor serial output:
pio device monitor --baud 115200
```

---

## WiFi Provisioning (Captive Portal)

The hub uses a captive portal for first-boot WiFi setup.

1. Power on hub
2. On your phone or laptop, connect to WiFi network: **RowTech-Setup**
3. A browser page should open automatically. If not, navigate to **http://192.168.4.1**
4. Enter your network SSID and password
5. Tap **Connect & Save**
6. Hub will restart and connect to your network

WiFi credentials are stored in ESP32 flash. The portal will **never appear again** unless you erase the flash (`pio run --target erase`).

---

## On-Water Setup

### First time with a new boat

1. Deploy Vercel, set up Supabase, flash all firmware
2. Open dashboard → **Boats** → create a new boat
3. Open dashboard → **Rowers** → create a profile for each rower
4. Open dashboard → **Boats** → select your boat → assign rowers to seats and sensor MACs to seats

### Starting a session

1. Mount sensors on oar collars (roll axis must align with oar shaft rotation)
2. Power on hub and all 8 sensors
3. Wait for hub LED to go **green** (all 8 sensors registered)
4. Open dashboard → click **Start Session** → select boat → confirm assignments → click Start
5. Live dashboard updates in real-time

### Ending a session

Click **End Session** in the dashboard header. Session is saved with duration and notes field.

### Adding a new sensor

No configuration needed. Power on the new sensor — it will register automatically with the hub, and the MAC address will appear in **Devices** after the first telemetry packet. Rename it and assign it to a boat seat.

---

## Threshold Tuning

All stroke detection thresholds are in `firmware/sensor/include/config.h`.

Flash with `DEBUG_MODE=1` for verbose serial output:
```bash
pio run --target upload --environment lolin32_lite_debug
```

Key thresholds to tune on water:
- `CATCH_ACCEL_THRESHOLD` — increase if false catches on water chop
- `CATCH_DECEL_THRESHOLD` — increase for sharper catch detection
- `SQUARED_WINDOW_DEG`   — reduce for stricter square-up detection
- `FEATHER_RATE_THRESHOLD` — increase if feathering triggers too early

See `docs/firmware-tuning.md` for detailed guidance.

---

## Architecture

```
[8× Sensor ESP32]
   MPU-6050 → Mahony filter → Stroke FSM → TelemetryPacket/StrokeSummaryPacket
   ──ESP-NOW──►
              [Hub ESP32]
              SensorState[8] + HTTP ring buffer
              ──HTTPS POST──►
                             [Vercel Next.js]
                             /api/telemetry  → Supabase telemetry table (upsert)
                             /api/strokes    → Supabase strokes table (insert)
                             ──Supabase Realtime──►
                                                   [Browser Dashboard]
                                                   useRowTech hook → React UI
```

---

## Repository Structure

```
rowtech/
├── firmware/
│   ├── sensor/          # Flash to all 8 oar sensors
│   │   ├── platformio.ini
│   │   ├── include/config.h
│   │   └── src/         # main.cpp, imu, stroke_fsm, espnow_link, led, packets
│   └── hub/             # Flash to cox box hub
│       ├── platformio.ini
│       ├── include/config.h
│       └── src/         # main.cpp, portal, wifi_mgr, espnow_hub, sensor_table, http_forwarder, logger
├── dashboard/           # Next.js 14 App Router
│   ├── app/             # Pages and API routes
│   ├── components/      # UI components (one per file)
│   ├── hooks/           # Data hooks (useRowTech, useSession, etc.)
│   ├── types/           # TypeScript types (index.ts — single source)
│   ├── constants/       # Seat colors, labels (seatColors.ts — single source)
│   ├── lib/             # Supabase clients, API helpers, validation
│   └── supabase/        # Migrations and seed data
└── docs/                # Firmware tuning, API reference, data model
```
