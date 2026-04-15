"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { PhaseType, type SeatState, type CrewState } from "@/types";
import { SEAT_ORDER } from "@/constants/seatColors";
import { mean, clamp } from "@/lib/utils";
import { useLocalWebSocket, type LocalSensorFrame } from "@/hooks/useLocalWebSocket";

// =============================================================================
// useRowTech — Primary live crew data hook
//
// Connects to Supabase Realtime and streams live telemetry for all 8 seats.
// Simulation mode is OFF by default — only enabled when the user explicitly
// toggles it (demo/testing without hardware). When no session is active,
// seats are shown as disconnected.
// =============================================================================

const STALE_TIMEOUT_MS   = 5000;   // Mark seat disconnected if no update for 5s
const SIMULATION_TICK_MS = 2000;

// ---------------------------------------------------------------------------
// Simulation helpers (only used when sim is explicitly enabled)
// ---------------------------------------------------------------------------

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

function buildSimulatedCrew(outlierSeat: number, tick: number): SeatState[] {
  const rng = seededRandom(tick * 1000 + outlierSeat);

  return SEAT_ORDER.map((seatNumber) => {
    const isOutlier    = seatNumber === outlierSeat;
    const basePhase    = tick % 4;
    const phase        = ((basePhase + (isOutlier ? 1 : 0)) % 4) as PhaseType;
    const featherAngle = isOutlier
      ? clamp(jitter(75, 5, rng), 65, 85)
      : clamp(jitter(87, 2, rng), 82, 92);
    const rushScore    = isOutlier
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

// ---------------------------------------------------------------------------
// Crew stats + outlier detection
// ---------------------------------------------------------------------------

function computeCrewStats(seats: SeatState[]): CrewState {
  const connected = seats.filter((s) => s.isConnected);
  const avgStrokeRate    = mean(connected.map((s) => s.strokeRate));
  const avgFeatherAngle  = mean(connected.map((s) => s.featherAngle));
  const avgRushScore     = mean(connected.map((s) => s.rushScore));
  const catchValues      = connected.map((s) => s.catchSharpness).filter((v) => v > 0);
  const timingSpread     = catchValues.length > 1
    ? Math.max(...catchValues) - Math.min(...catchValues)
    : 0;
  return { seats, avgStrokeRate, avgFeatherAngle, avgRushScore, timingSpread };
}

function detectOutlier(seats: SeatState[]): number | null {
  const connected = seats.filter((s) => s.isConnected);
  if (connected.length < 2) return null;
  const avgRush = mean(connected.map((s) => s.rushScore));
  let maxDist = 0;
  let outlier = connected[0]!;
  for (const seat of connected) {
    const dist = Math.abs(seat.rushScore - avgRush);
    if (dist > maxDist) { maxDist = dist; outlier = seat; }
  }
  return maxDist > 1.5 ? outlier.seatNumber : null;
}

function makeDefaultSeat(seatNumber: number): SeatState {
  return {
    seatNumber,
    mac:            null,
    rowerName:      null,
    rowerPhotoUrl:  null,
    phase:          PhaseType.RECOVERY,
    roll:           0,
    pitch:          0,
    featherAngle:   0,
    rushScore:      0,
    strokeRate:     0,
    catchSharpness: 0,
    batteryLevel:   0,
    isConnected:    false,
    lastUpdated:    0,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseRowTechReturn {
  crewState:         CrewState;
  outlierSeatNumber: number | null;
  isLive:            boolean;
  isSimulated:       boolean;
  isLocalStream:     boolean;   // true = connected to hub WS directly (~5ms)
  sessionTime:       number;
  connectedCount:    number;
  toggleSimulation:  () => void;
  hubHost:           string;
  setHubHost:        (host: string) => void;
}

// ---------------------------------------------------------------------------
// Seat → MAC lookup built from the active session's boat seat assignments.
// Passed in as a prop so useRowTech stays pure (no Supabase reads here).
// ---------------------------------------------------------------------------

export function useRowTech(
  activeSessionId: string | null,
  macToSeat: Map<string, number> = new Map(),
): UseRowTechReturn {
  const [seats,       setSeats]       = useState<SeatState[]>(SEAT_ORDER.map(makeDefaultSeat));
  const [isLive,      setIsLive]      = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [simTick,     setSimTick]     = useState(0);

  const sessionStartRef  = useRef<number>(Date.now());
  const staleTimers      = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const outlierSeatRef   = useRef<number>(Math.floor(Math.random() * 8) + 1);
  const macToSeatRef     = useRef(macToSeat);
  useEffect(() => { macToSeatRef.current = macToSeat; }, [macToSeat]);

  // Session timer
  useEffect(() => {
    sessionStartRef.current = Date.now();
    const id = setInterval(() => setSessionTime(Date.now() - sessionStartRef.current), 1000);
    return () => clearInterval(id);
  }, [activeSessionId]);

  // Reset seats when session changes
  useEffect(() => {
    setSeats(SEAT_ORDER.map(makeDefaultSeat));
    setIsLive(false);
    staleTimers.current.forEach(clearTimeout);
    staleTimers.current.clear();
  }, [activeSessionId]);

  // ---------------------------------------------------------------------------
  // Shared handler: apply one sensor frame to seat state.
  // Used by both the local WS path and the Supabase broadcast fallback.
  // ---------------------------------------------------------------------------
  const applySensorFrame = useCallback((
    seatNum: number,
    mac: string,
    phase: number,
    roll: number,
    featherAngle: number,
    rushScore: number,
    strokeRate: number,
    catchSharpness: number,
    batteryLevel: number,
  ) => {
    setIsLive(true);

    const existing = staleTimers.current.get(seatNum);
    if (existing) clearTimeout(existing);
    staleTimers.current.set(
      seatNum,
      setTimeout(() => {
        setSeats((prev) =>
          prev.map((s) => s.seatNumber === seatNum ? { ...s, isConnected: false } : s),
        );
        setSeats((prev) => {
          if (prev.every((s) => !s.isConnected)) setIsLive(false);
          return prev;
        });
      }, STALE_TIMEOUT_MS),
    );

    setSeats((prev) =>
      prev.map((s) =>
        s.seatNumber === seatNum
          ? {
              ...s,
              mac,
              phase:          phase as PhaseType,
              roll,
              pitch:          0,
              featherAngle,
              rushScore,
              strokeRate,
              catchSharpness,
              batteryLevel,
              isConnected:    true,
              lastUpdated:    Date.now(),
            }
          : s,
      ),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Local WebSocket — primary path (~5ms, hub pushes on every ESP-NOW packet)
  // ---------------------------------------------------------------------------
  const handleLocalFrame = useCallback((frame: LocalSensorFrame) => {
    if (isSimulated) return;
    const seatNum = macToSeatRef.current.get(frame.mac);
    if (!seatNum) return;   // MAC not assigned to any seat in this session
    applySensorFrame(
      seatNum, frame.mac, frame.phase, frame.roll,
      frame.featherAngle, frame.rushScore, frame.strokeRate,
      frame.catchSharpness,
      // Convert voltage to rough % for display (3.0V=0%, 4.2V=100%)
      Math.round(Math.min(100, Math.max(0, (frame.batteryVoltage - 3.0) / 1.2 * 100))),
    );
  }, [isSimulated, applySensorFrame]);

  const { isConnected: isLocalStream, hubHost, setHubHost } = useLocalWebSocket({
    onFrame: handleLocalFrame,
  });

  // ---------------------------------------------------------------------------
  // Supabase broadcast — fallback path (~50ms, fires after API upsert)
  // Disabled when the local WebSocket is connected to avoid double-updates.
  // ---------------------------------------------------------------------------
  // Realtime subscription — uses broadcast (not postgres_changes) so updates
  // arrive ~50ms after the hub POST instead of waiting for the WAL.
  useEffect(() => {
    // Skip cloud subscription when the local WebSocket is delivering frames.
    // Keep the subscription alive but inactive so it reconnects instantly
    // if the local WS drops.
    if (!activeSessionId || isSimulated || isLocalStream) return;

    const supabase = createClient();

    type BroadcastSensor = {
      device_mac:      string;
      seat_number:     number | null;
      phase:           number | null;
      roll:            number | null;
      feather_angle:   number | null;
      rush_score:      number | null;
      stroke_rate:     number | null;
      catch_sharpness: number | null;
      battery_level:   number | null;
    };

    const channel = supabase
      .channel(`session:${activeSessionId}`)
      .on(
        "broadcast",
        { event: "telemetry" },
        (msg: { payload: { sensors: BroadcastSensor[] } }) => {
          for (const row of msg.payload.sensors) {
            const seatNum = row.seat_number;
            if (!seatNum) continue;
            applySensorFrame(
              seatNum, row.device_mac,
              row.phase           ?? 0,
              row.roll            ?? 0,
              row.feather_angle   ?? 0,
              row.rush_score      ?? 0,
              row.stroke_rate     ?? 0,
              row.catch_sharpness ?? 0,
              row.battery_level   ?? 0,
            );
          }
        },
      )
      .subscribe();

    return () => {
      staleTimers.current.forEach(clearTimeout);
      staleTimers.current.clear();
      void supabase.removeChannel(channel);
    };
  }, [activeSessionId, isSimulated, isLocalStream, applySensorFrame]);

  // Simulation tick
  useEffect(() => {
    if (!isSimulated) return;
    const id = setInterval(() => setSimTick((t) => t + 1), SIMULATION_TICK_MS);
    return () => clearInterval(id);
  }, [isSimulated]);

  // Apply simulated data
  useEffect(() => {
    if (!isSimulated) return;
    setSeats(buildSimulatedCrew(outlierSeatRef.current, simTick));
  }, [isSimulated, simTick]);

  const toggleSimulation = useCallback(() => {
    setIsSimulated((prev) => {
      const next = !prev;
      if (next) {
        outlierSeatRef.current = Math.floor(Math.random() * 8) + 1;
        setIsLive(false);
      } else {
        setSeats(SEAT_ORDER.map(makeDefaultSeat));
      }
      return next;
    });
  }, []);

  const crewState      = computeCrewStats(seats);
  const outlierSeatNum = detectOutlier(seats);
  const connectedCount = seats.filter((s) => s.isConnected).length;

  return {
    crewState,
    outlierSeatNumber: isSimulated ? outlierSeatRef.current : outlierSeatNum,
    isLive,
    isSimulated,
    isLocalStream,
    sessionTime,
    connectedCount,
    toggleSimulation,
    hubHost,
    setHubHost,
  };
}
