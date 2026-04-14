// =============================================================================
// RowTech TypeScript Types
// Single source of truth for all entity, API, and component prop types.
// Import exclusively from here — no inline type definitions in components.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum PhaseType {
  RECOVERY = 0,
  CATCH    = 1,
  DRIVE    = 2,
  FINISH   = 3,
}

// ---------------------------------------------------------------------------
// Database entities (mirror Supabase schema)
// ---------------------------------------------------------------------------

export interface Device {
  id:               string;
  mac_address:      string;
  name:             string | null;
  last_seen:        string | null;   // ISO timestamp
  battery_level:    number | null;   // 0–100
  firmware_version: string | null;
  created_at:       string;
}

export interface Profile {
  id:         string;
  name:       string;
  photo_url:  string | null;
  side:       "port" | "starboard" | null;
  height_cm:  number | null;
  weight_kg:  number | null;
  notes:      string | null;
  created_at: string;
}

export interface Boat {
  id:         string;
  name:       string;
  seat_count: number;
  created_at: string;
}

export interface BoatSeat {
  id:          string;
  boat_id:     string;
  seat_number: number;           // 1–8
  profile_id:  string | null;
  device_mac:  string | null;
}

export interface Session {
  id:         string;
  boat_id:    string | null;
  started_at: string;
  ended_at:   string | null;
  duration:   number | null;    // seconds
  avg_rate:   number | null;    // SPM
  notes:      string | null;
  created_at: string;
}

export interface Stroke {
  id:                  string;
  session_id:          string;
  device_mac:          string | null;
  seat_number:         number | null;
  profile_id:          string | null;
  timestamp:           number;           // sensor millis()
  phase:               number | null;
  feather_angle:       number | null;
  feather_consistency: number | null;
  rush_score:          number | null;
  catch_sharpness:     number | null;
  stroke_rate:         number | null;
  roll:                number | null;
  pitch:               number | null;
}

export interface TelemetryEntry {
  id:              string;
  device_mac:      string;
  seat_number:     number | null;
  session_id:      string | null;
  timestamp:       number;
  phase:           number | null;
  roll:            number | null;
  feather_angle:   number | null;
  rush_score:      number | null;
  stroke_rate:     number | null;
  catch_sharpness: number | null;
  battery_level:   number | null;
  inserted_at:     string;
}

// ---------------------------------------------------------------------------
// Extended / joined types returned by API
// ---------------------------------------------------------------------------

export interface DeviceWithAssignment extends Device {
  boat_name:   string | null;
  seat_number: number | null;
  rower_name:  string | null;
}

export interface BoatWithSeats extends Boat {
  seats: BoatSeatPopulated[];
}

export interface BoatSeatPopulated extends BoatSeat {
  profile:    Profile | null;
  device:     Device  | null;
}

export interface SessionWithMeta extends Session {
  boat_name:   string | null;
  rower_count: number;
}

export interface SessionDetail extends Session {
  boat:        Boat | null;
  seats:       BoatSeatPopulated[];
  strokes_by_seat: Record<number, Stroke[]>;  // seat_number → strokes
}

export interface ProfileWithStats extends Profile {
  session_count: number;
  avg_feather:   number | null;
  avg_rush:      number | null;
}

export interface ProfileSession {
  session:          Session;
  boat_name:        string | null;
  avg_feather:      number | null;
  avg_rush:         number | null;
  avg_catch:        number | null;
  avg_stroke_rate:  number | null;
  stroke_count:     number;
}

// ---------------------------------------------------------------------------
// Live / real-time state types (used by useRowTech hook and components)
// ---------------------------------------------------------------------------

export interface SeatState {
  seatNumber:     number;        // 1–8
  mac:            string | null;
  rowerName:      string | null;
  rowerPhotoUrl:  string | null;
  phase:          PhaseType;
  roll:           number;
  pitch:          number;
  featherAngle:   number;
  rushScore:      number;
  strokeRate:     number;
  catchSharpness: number;
  batteryLevel:   number;        // 0–100
  isConnected:    boolean;
  lastUpdated:    number;        // Date.now() ms
}

export interface CrewState {
  seats:          SeatState[];
  avgStrokeRate:  number;
  avgFeatherAngle: number;
  avgRushScore:   number;
  timingSpread:   number;       // max catchSharpness - min catchSharpness (ms)
}

export interface StrokeSummary {
  mac:                string;
  featherAngle:       number;
  featherConsistency: number;
  rushScore:          number;
  catchSharpness:     number;
  strokeRate:         number;
  timestamp:          number;
}

// ---------------------------------------------------------------------------
// API request / response types
// ---------------------------------------------------------------------------

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError      = { ok: false; error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// POST /api/telemetry request body
export interface TelemetryPostBody {
  sensors: TelemetryEntryInput[];
}

export interface TelemetryEntryInput {
  mac:            string;
  phase:          number;
  roll:           number;
  pitch:          number;
  featherAngle:   number;
  rushScore:      number;
  strokeRate:     number;
  catchSharpness: number;
  batteryVoltage: number;
  timestamp:      number;
}

// POST /api/strokes request body
export interface StrokePostBody {
  mac:                string;
  featherAngle:       number;
  featherConsistency: number;
  rushScore:          number;
  catchSharpness:     number;
  strokeRate:         number;
  timestamp:          number;
}

// POST /api/sessions request body
export interface CreateSessionBody {
  boat_id: string;
}

// PUT /api/sessions/[id] request body
export interface UpdateSessionBody {
  ended_at?: string;
  duration?: number;
  notes?:    string;
  avg_rate?: number;
}

// POST /api/boats request body
export interface CreateBoatBody {
  name: string;
}

// PUT /api/boats/[id] request body
export interface UpdateBoatBody {
  name?:       string;
  seat_count?: number;
  seats?:      UpdateSeatAssignment[];
}

export interface UpdateSeatAssignment {
  seat_number: number;
  profile_id:  string | null;
  device_mac:  string | null;
}

// PUT /api/devices/[mac] request body
export interface UpdateDeviceBody {
  name: string;
}

// POST /api/profiles request body
export interface CreateProfileBody {
  name:      string;
  photo_url?: string;
  side?:     "port" | "starboard";
  height_cm?: number;
  weight_kg?: number;
  notes?:    string;
}

// PUT /api/profiles/[id] request body
export type UpdateProfileBody = Partial<CreateProfileBody>;

// ---------------------------------------------------------------------------
// Component prop types
// ---------------------------------------------------------------------------

export interface SeatCardProps {
  seat:       SeatState;
  isOutlier:  boolean;
  color:      string;
  label:      string;
}

export interface PhaseIndicatorProps {
  phase: PhaseType;
}

export interface FeatherGaugeProps {
  angleDeg:  number;
  color:     string;
}

export interface RushBarProps {
  value:  number;   // 0–10
  color:  string;
}

export interface OverlayLineChartProps {
  series: ChartSeries[];
  height?: number;
}

export interface ChartSeries {
  seatNumber: number;
  color:      string;
  data:       ChartDataPoint[];
  active:     boolean;
}

export interface ChartDataPoint {
  x:     number;   // stroke index or timestamp
  value: number;
}

export interface SparklineChartProps {
  data:   number[];
  color:  string;
  height?: number;
}

export interface ArcGaugeProps {
  value:     number;   // 0–90 for feather gauge
  min:       number;
  max:       number;
  color:     string;
  label:     string;
}

export interface MetricTrendCardProps {
  label:     string;
  value:     number;
  unit:      string;
  data:      number[];
  color:     string;
  trend:     "up" | "down" | "flat";
}

export interface SessionCardProps {
  session: SessionWithMeta;
}

export interface RowerCardProps {
  profile: ProfileWithStats;
}

export interface DeviceCardProps {
  device:   DeviceWithAssignment;
  onRename: (mac: string, name: string) => Promise<boolean>;
}

export interface SeatSlotProps {
  seatNumber:   number;
  seat:         BoatSeatPopulated | null;
  profiles:     Profile[];
  devices:      Device[];
  onAssign:     (seatNumber: number, profileId: string | null, deviceMac: string | null) => void;
}

export interface TimingSpreadProps {
  seats:          SeatState[];
  outlierSeat:    number | null;
  colors:         Record<number, string>;
}

export interface CrewStatsProps {
  crewState:   CrewState;
  isSimulated: boolean;
}

export interface BoatViewProps {
  seats:       SeatState[];
  outlierSeat: number | null;
  isSimulated: boolean;
}
