"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { PhaseType, type SeatState, type CrewState } from "@/types";
import { SEAT_ORDER } from "@/constants/seatColors";
import { mean, voltageToPercent, clamp } from "@/lib/utils";

// =============================================================================
// useRowTech — Primary live crew data hook
//
// When an active session is live and Supabase Realtime delivers telemetry,
// isLive = true and seats reflect real sensor data.
//
// When no session is active OR no real data arrives within 3 seconds,
// simulation mode activates: isLive = false, seats are synthetic data with
// one outlier seat (re-randomized on each simulation start).
//
// SIMULATION MODE IS ALWAYS CLEARLY LABELED. Never assume isLive = true.
// =============================================================================

const REALTIME_TIMEOUT_MS    = 3000;  // Fall back to sim if no data for 3s
const SIMULATION_TICK_MS     = 2000;  // Update sim every 2s (one stroke interval)

// Seeded pseudo-random for deterministic-ish simulation within a session
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function jitter(base: number, range: number, rng: () => number): number {
  return base + (rng() - 0.5) * 2 * range;
}

function buildSimulatedCrew(
  outlierSeat: number,
  tick: number,
): SeatState[] {
  const rng = seededRandom(tick * 1000 + outlierSeat);

  return SEAT_ORDER.map((seatNumber) => {
    const isOutlier = seatNumber === outlierSeat;

    // Phase cycles through RECOVERY → CATCH → DRIVE → FINISH → RECOVERY
    // Offset outlier by 1 phase step
    const basePhaseStep = tick % 4;
    const phaseOffset   = isOutlier ? 1 : 0;
    const phase         = ((basePhaseStep + phaseOffset) % 4) as PhaseType;

    const featherAngle   = isOutlier
      ? clamp(jitter(75, 5, rng), 65, 85)
      : clamp(jitter(87, 2, rng), 82, 92);

    const rushScore = isOutlier
      ? clamp(jitter(7, 1, rng), 5.5, 8.5)
      : clamp(jitter(3, 0.5, rng), 1.5, 4.5);

    const catchSharpness = isOutlier
      ? Math.round(clamp(jitter(160, 20, rng), 130, 200))
      : Math.round(clamp(jitter(95, 20, rng), 60, 140));

    const strokeRate = clamp(jitter(30, 1, rng), 26, 34);

    return {
      seatNumber,
      mac:           null,
      rowerName:     null,
      rowerPhotoUrl: null,
      phase,
      roll:          isOutlier ? featherAngle : 89,
      pitch:         clamp(jitter(2, 1, rng), -5, 10),
      featherAngle,
      rushScore,
      strokeRate,
      catchSharpness,
      batteryLevel:  100,
      isConnected:   true,
      lastUpdated:   Date.now(),
    };
  });
}

function computeCrewStats(seats: SeatState[]): CrewState {
  const connected = seats.filter((s) => s.isConnected);

  const avgStrokeRate   = mean(connected.map((s) => s.strokeRate));
  const avgFeatherAngle = mean(connected.map((s) => s.featherAngle));
  const avgRushScore    = mean(connected.map((s) => s.rushScore));

  const catchValues = connected.map((s) => s.catchSharpness).filter((v) => v > 0);
  const timingSpread = catchValues.length > 1
    ? Math.max(...catchValues) - Math.min(...catchValues)
    : 0;

  return { seats, avgStrokeRate, avgFeatherAngle, avgRushScore, timingSpread };
}

function detectOutlier(seats: SeatState[]): number | null {
  const connected = seats.filter((s) => s.isConnected);
  if (connected.length < 2) return null;

  const avgRush = mean(connected.map((s) => s.rushScore));
  let maxDist   = 0;
  let outlier   = connected[0]!;

  for (const seat of connected) {
    const dist = Math.abs(seat.rushScore - avgRush);
    if (dist > maxDist) {
      maxDist = dist;
      outlier = seat;
    }
  }

  return maxDist > 1.5 ? outlier.seatNumber : null;
}

function makeDefaultSeat(seatNumber: number): SeatState {
  return {
    seatNumber,
    mac:           null,
    rowerName:     null,
    rowerPhotoUrl: null,
    phase:         PhaseType.RECOVERY,
    roll:          0,
    pitch:         0,
    featherAngle:  0,
    rushScore:     0,
    strokeRate:    0,
    catchSharpness: 0,
    batteryLevel:  0,
    isConnected:   false,
    lastUpdated:   0,
  };
}

interface UseRowTechReturn {
  crewState:        CrewState;
  outlierSeatNumber: number | null;
  isLive:           boolean;
  isSimulated:      boolean;
  sessionTime:      number;         // elapsed ms since session start
  connectedCount:   number;
}

export function useRowTech(
  activeSessionId: string | null,
): UseRowTechReturn {
  const [seats, setSeats] = useState<SeatState[]>(
    SEAT_ORDER.map(makeDefaultSeat),
  );
  const [isLive,          setIsLive]          = useState(false);
  const [isSimulated,     setIsSimulated]     = useState(true);
  const [sessionTime,     setSessionTime]     = useState(0);
  const [simTick,         setSimTick]         = useState(0);

  const sessionStartRef   = useRef<number>(Date.now());
  const lastRealtimeRef   = useRef<number>(0);
  const outlierSeatRef    = useRef<number>(Math.floor(Math.random() * 8) + 1);
  const realtimeTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Session timer ---
  useEffect(() => {
    sessionStartRef.current = Date.now();
    const id = setInterval(() => {
      setSessionTime(Date.now() - sessionStartRef.current);
    }, 1000);
    return () => clearInterval(id);
  }, [activeSessionId]);

  // --- Realtime subscription ---
  useEffect(() => {
    if (!activeSessionId) {
      setIsLive(false);
      setIsSimulated(true);
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`telemetry:${activeSessionId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "telemetry",
          filter: `session_id=eq.${activeSessionId}`,
        },
        (payload) => {
          const row = payload.new as {
            device_mac:      string;
            seat_number:     number | null;
            phase:           number | null;
            roll:            number | null;
            feather_angle:   number | null;
            rush_score:      number | null;
            stroke_rate:     number | null;
            catch_sharpness: number | null;
            battery_level:   number | null;
            timestamp:       number;
          };

          lastRealtimeRef.current = Date.now();
          setIsLive(true);
          setIsSimulated(false);

          // Reset realtime timeout
          if (realtimeTimeoutId.current) clearTimeout(realtimeTimeoutId.current);
          realtimeTimeoutId.current = setTimeout(() => {
            setIsLive(false);
            setIsSimulated(true);
          }, REALTIME_TIMEOUT_MS);

          setSeats((prev) => {
            const seatNum = row.seat_number;
            if (!seatNum) return prev;
            return prev.map((s) =>
              s.seatNumber === seatNum
                ? {
                    ...s,
                    mac:            row.device_mac,
                    phase:          (row.phase ?? 0) as PhaseType,
                    roll:           row.roll ?? 0,
                    pitch:          0,
                    featherAngle:   row.feather_angle   ?? 0,
                    rushScore:      row.rush_score      ?? 0,
                    strokeRate:     row.stroke_rate     ?? 0,
                    catchSharpness: row.catch_sharpness ?? 0,
                    batteryLevel:   row.battery_level   ?? 0,
                    isConnected:    true,
                    lastUpdated:    Date.now(),
                  }
                : s,
            );
          });
        },
      )
      .subscribe();

    // Initial timeout — if no data arrives in 3s, go to simulation
    realtimeTimeoutId.current = setTimeout(() => {
      if (Date.now() - lastRealtimeRef.current > REALTIME_TIMEOUT_MS) {
        setIsLive(false);
        setIsSimulated(true);
      }
    }, REALTIME_TIMEOUT_MS);

    return () => {
      if (realtimeTimeoutId.current) clearTimeout(realtimeTimeoutId.current);
      void supabase.removeChannel(channel);
    };
  }, [activeSessionId]);

  // --- Simulation mode tick ---
  useEffect(() => {
    if (!isSimulated) return;

    const id = setInterval(() => {
      setSimTick((t) => t + 1);
    }, SIMULATION_TICK_MS);

    return () => clearInterval(id);
  }, [isSimulated]);

  // --- Apply simulation data when in sim mode ---
  const simSeats = useCallback(() => {
    if (!isSimulated) return;
    setSeats(buildSimulatedCrew(outlierSeatRef.current, simTick));
  }, [isSimulated, simTick]);

  useEffect(() => {
    simSeats();
  }, [simSeats]);

  // Re-randomize outlier on each new simulation start
  useEffect(() => {
    if (isSimulated) {
      outlierSeatRef.current = Math.floor(Math.random() * 8) + 1;
    }
  }, [isSimulated]);

  const crewState       = computeCrewStats(seats);
  const outlierSeatNum  = detectOutlier(seats);
  const connectedCount  = seats.filter((s) => s.isConnected).length;

  return {
    crewState,
    outlierSeatNumber: isSimulated ? outlierSeatRef.current : outlierSeatNum,
    isLive,
    isSimulated,
    sessionTime,
    connectedCount,
  };
}
