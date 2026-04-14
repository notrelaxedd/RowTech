import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a duration in seconds as "HH:MM:SS" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Format milliseconds elapsed as "MM:SS" */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return formatDuration(totalSeconds);
}

/** Convert battery voltage (3.0–4.2V LiPo) to percentage 0–100 */
export function voltageToPercent(voltage: number): number {
  const MIN_V = 3.0;
  const MAX_V = 4.2;
  const pct = ((voltage - MIN_V) / (MAX_V - MIN_V)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Round to N decimal places */
export function round(value: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Compute mean of a number array */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Format a date as "Apr 14, 2026" */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

/** Format a date as "14 Apr 2026, 09:30" */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
