import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO() {
  return new Date().toISOString();
}

export function dayKey(d: Date = new Date()) {
  // YYYY-MM-DD in local time
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// YYYY-MM-DD -> ISO datetime, for logging a workout on a past day (fixed
// midday: avoids the timezone shifting it to the day before/after)
export function dateToISO(date: string) {
  return new Date(date + "T12:00:00").toISOString();
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function fmtDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function dayName(d: Date = new Date()) {
  return DAYS[d.getDay()];
}

// Detects a plan's reps field for a held-for-time exercise (planks, holds...),
// e.g. "30s", "20 s/side" or a range like "20-30s" (target = the upper bound)
// — returns the target seconds, or null if it's a normal rep-based exercise.
export function parseTimeSec(reps: string): number | null {
  const m = reps.trim().match(/^(\d+)(?:\s*[-–—]\s*(\d+))?\s*s(\/\w+)?$/i);
  if (!m) return null;
  return parseInt(m[2] ?? m[1], 10);
}

// Exercise names that are always bodyweight-only in this app's plans (no
// external load to log) — detected by name rather than a plan field, so it
// applies retroactively to plans already saved by existing users too.
const BODYWEIGHT_PATTERNS = [
  /push-?up/i,
  /pull-?up/i,
  /chin-?up/i,
  /sit-?up/i,
  /crunch/i,
  /mountain climbers?/i,
  /superman/i,
  /dead ?bug/i,
  /step-?up/i,
  /bodyweight squat/i,
  /air squat/i,
  /bench dips?/i,
  /tricep dips?/i,
  /glute bridge/i,
  /burpee/i,
  /jumping jacks?/i,
  /high knees/i,
  /bear crawl/i,
  /inverted row/i,
  /bird ?dog/i,
  /hyper-?extensions?/i,
  /back extensions?/i,
];

// An explicit weight in the name ("Bird Dog with Light Dumbbell") beats the
// pattern list — those variants do need a kg field.
const WEIGHTED_HINTS = /dumbbell|kettlebell|barbell|weighted|mancuerna|pesa|lastre/i;

export function isBodyweightOnly(name: string): boolean {
  if (WEIGHTED_HINTS.test(name)) return false;
  return BODYWEIGHT_PATTERNS.some((re) => re.test(name));
}

// Best set of an exercise (highest kg, ties broken by reps)
export function bestSet(sets: { kg: number | ""; reps: number | "" }[]) {
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    const kg = typeof s.kg === "number" ? s.kg : 0;
    const reps = typeof s.reps === "number" ? s.reps : 0;
    if (kg === 0 && reps === 0) continue;
    if (!best || kg > best.kg || (kg === best.kg && reps > best.reps)) {
      best = { kg, reps };
    }
  }
  return best;
}
