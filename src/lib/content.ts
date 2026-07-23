import type { Plan, BodyLog, NutritionTargets, Recipe, ShoppingCategory, CycleLog } from "./types";
import freeMeals from "../../content/nutrition/free-meals.json";
import exerciseImages1 from "../../content/knowledge/exercise-images-1.json";
import exerciseImages2 from "../../content/knowledge/exercise-images-2.json";
import exerciseImages3 from "../../content/knowledge/exercise-images-3.json";
import exerciseImages4 from "../../content/knowledge/exercise-images-4.json";

export const FREE_MEALS = freeMeals;

// free-exercise-db (yuhonas/free-exercise-db, public domain) trimmed to just
// what we need to build image URLs: name, id (the CDN folder), and how many
// numbered images that exercise has. Split into 4 chunk files to keep each
// file a manageable size to read/edit.
type ExerciseImageEntry = { name: string; id: string; n: number };
const EXERCISE_IMAGE_INDEX = [
  ...exerciseImages1,
  ...exerciseImages2,
  ...exerciseImages3,
  ...exerciseImages4,
] as ExerciseImageEntry[];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // drop parenthetical asides, e.g. "(or X if Y)"
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set(["or", "if", "and", "with", "the", "a", "uncomfortable", "preferred", "wide", "grip", "light", "heavy"]);

function words(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
      .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)) // light stemming for plurals
  );
}

// Plan exercises often read like "Leg Press or Hack Squat" or include a
// parenthetical alternative — match against the first/primary option.
function primaryName(name: string): string {
  const noParens = name.replace(/\(.*?\)/g, " ").trim();
  return noParens.split(/\bor\b/i)[0].trim() || noParens;
}

// Curated fixes where the fuzzy match fails: "Side Plank" matched the regular
// Plank (free-exercise-db calls it "Side Bridge"), and the hollow body hold
// has no photo in the db at all, so we ship a local illustration.
const IMAGE_OVERRIDES: Record<string, string[]> = {
  "side plank": cdnImages("Side_Bridge", 2),
  // "stationary bike" fuzzy-matches "Air Bike" (bicycle crunches) — wrong photo
  "stationary bike": cdnImages("Bicycling_Stationary", 2),
  "light stationary bike": cdnImages("Bicycling_Stationary", 2),
  "easy stationary bike": cdnImages("Bicycling_Stationary", 2),
  "hollow body hold": ["/exercises/hollow-body-hold.svg"],
  "hollow hold": ["/exercises/hollow-body-hold.svg"],
};

function cdnImages(id: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${id}/${i}.jpg`
  );
}

const indexCache = new Map<string, { id: string; n: number } | null>();

function findMatch(name: string): { id: string; n: number } | null {
  const query = primaryName(name);
  if (indexCache.has(query)) return indexCache.get(query)!;

  const normQuery = normalize(query);
  const queryWords = words(query);
  let best: { id: string; n: number } | null = null;
  let bestScore = 0;

  for (const e of EXERCISE_IMAGE_INDEX) {
    const normCandidate = normalize(e.name);
    if (normCandidate === normQuery) {
      best = { id: e.id, n: e.n };
      bestScore = 1;
      break;
    }
    const candidateWords = words(e.name);
    let overlap = 0;
    for (const w of queryWords) if (candidateWords.has(w)) overlap++;
    const dice = (2 * overlap) / (queryWords.size + candidateWords.size || 1);
    if (dice > bestScore) {
      bestScore = dice;
      best = { id: e.id, n: e.n };
    }
  }

  const result = bestScore >= 0.45 ? best : null;
  indexCache.set(query, result);
  return result;
}

export function imagesFor(name: string): string[] {
  const override = IMAGE_OVERRIDES[normalize(primaryName(name))];
  if (override) return override;
  const match = findMatch(name);
  if (!match) return [];
  return cdnImages(match.id, match.n);
}

// Used before onboarding finishes (the page tree still renders behind the
// AppGate overlay), so every page hook has a safe, empty value to read.
export const EMPTY_PLAN: Plan = {
  id: "empty",
  name: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  startingWeight: 0,
  targetWeight: 0,
  frequency: "",
  structure: "",
  summary: "",
  phases: [],
  weeklySplit: [],
  splitNote: "",
  warmup: { duration: "", note: "", steps: [] },
  sessions: [],
  progressions: [],
  safetyNote: "",
};

export const EMPTY_NUTRITION: NutritionTargets = { kcal: 0, protein: 0, carbs: 0, fats: 0 };
export const EMPTY_RECIPES: Recipe[] = [];
export const EMPTY_SHOPPING_LIST: ShoppingCategory[] = [];

// Effective start date: whatever the user picked in the app takes priority
// over the plan's fixed date, so the plan adapts to real life.
export function effectiveStartDate(plan: Plan, override?: string | null) {
  return override || plan.startDate;
}

// Plan week (1-based) from the start date (with optional override).
export function planWeek(plan: Plan, today = new Date(), override?: string | null) {
  const start = new Date(effectiveStartDate(plan, override)).getTime();
  const days = Math.floor((today.getTime() - start) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

// Total number of weeks the plan runs (derived from its phases).
export function planTotalWeeks(plan: Plan) {
  let max = 0;
  for (const f of plan.phases) {
    const parts = f.weeks.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
    max = Math.max(max, parts[parts.length - 1] || 0);
  }
  return max || 12;
}

// Name of the active phase based on the current week (maps "1–4", "5–8"...).
export function currentPhase(plan: Plan, today = new Date(), override?: string | null) {
  const week = planWeek(plan, today, override);
  for (const f of plan.phases) {
    const [a, b] = f.weeks.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
    if (week >= a && week <= (b || a)) return f.name;
  }
  return plan.phases[plan.phases.length - 1]?.name;
}

// Last week number of a phase ("1–3" -> 3, "5" -> 5).
function phaseEndWeek(weeks: string) {
  const parts = weeks.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
  return parts[parts.length - 1] || parts[0] || 0;
}

// Phase whose FINAL week the given date falls in, or null. Drives the
// "phase completed — prepare the next one" notice on the workout-saved screen.
export function finalWeekPhase(plan: Plan, override: string | null | undefined, date = new Date()) {
  if (!plan.phases.length || !planStarted(plan, override, date)) return null;
  const week = planWeek(plan, date, override);
  for (let i = 0; i < plan.phases.length; i++) {
    if (week === phaseEndWeek(plan.phases[i].weeks)) return { index: i, name: plan.phases[i].name };
  }
  return null;
}

// Most recent phase already fully behind today (its last week is over), or
// null if we're still inside the first phase. Drives the persistent
// "prepare next phase" card until the new plan gets imported.
export function lastEndedPhase(plan: Plan, override: string | null | undefined, today = new Date()) {
  if (!plan.phases.length || !planStarted(plan, override, today)) return null;
  const week = planWeek(plan, today, override);
  let ended: { index: number; name: string } | null = null;
  plan.phases.forEach((f, i) => {
    if (week > phaseEndWeek(f.weeks)) ended = { index: i, name: f.name };
  });
  return ended;
}

// Has the plan started yet? (true if the effective start date is today or earlier)
export function planStarted(plan: Plan, override?: string | null, today = new Date()) {
  const start = new Date(effectiveStartDate(plan, override));
  start.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return t.getTime() >= start.getTime();
}

// Real starting weight: the first weigh-in logged since the plan started.
// Falls back to the last known weigh-in before the plan started, and if
// there's no data at all, to the plan's estimated starting weight.
export function effectiveStartingWeight(plan: Plan, bodyLogs: BodyLog[], override?: string | null) {
  const start = new Date(effectiveStartDate(plan, override));
  start.setHours(0, 0, 0, 0);
  const weights = bodyLogs
    .filter((b) => b.weight !== "")
    .map((b) => ({ t: new Date(b.date).getTime(), weight: Number(b.weight) }))
    .sort((a, b) => a.t - b.t);
  if (!weights.length) return plan.startingWeight;
  const since = weights.find((w) => w.t >= start.getTime());
  return (since ?? weights[weights.length - 1]).weight;
}

// Latest known weight from manual weigh-ins (or null if there's none).
export function latestWeight(bodyLogs: BodyLog[]): number | null {
  const weights = bodyLogs
    .filter((b) => b.weight !== "")
    .map((b) => ({ t: new Date(b.date).getTime(), weight: Number(b.weight) }))
    .sort((a, b) => b.t - a.t);
  return weights[0]?.weight ?? null;
}

// ── Menstrual cycle ──────────────────────────────────────────────────────────
// Ported from ena-fit (C:\workout Ena\ena-fit\src\lib\content.ts), trimmed to
// just the tracking math — no steps/activity logic from that app.

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal";

export type CycleInfo = {
  hasData: boolean;
  lastStart: string | null; // YYYY-MM-DD
  day: number | null; // cycle day (1-based)
  phase: CyclePhase | null;
  nextStart: string | null; // predicted YYYY-MM-DD
  daysToNext: number | null;
  avgLength: number; // observed or default
};

export const PHASE_LABEL: Record<CyclePhase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
};

export const PHASE_EMOJI: Record<CyclePhase, string> = {
  menstrual: "🩸",
  follicular: "🌱",
  ovulation: "🌕",
  luteal: "🌗",
};

function dkey(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000
  );
}

export function phaseForDay(day: number, avgLength: number, periodLength: number): CyclePhase {
  const ovulation = avgLength - 14; // luteal phase is ~constant 14 days
  if (day <= periodLength) return "menstrual";
  if (day < ovulation - 1) return "follicular";
  if (day <= ovulation + 1) return "ovulation";
  return "luteal";
}

export function cycleInfo(
  periods: CycleLog[],
  defaultAvg: number,
  periodLength: number,
  today = new Date()
): CycleInfo {
  const starts = periods
    .map((p) => p.start)
    .filter(Boolean)
    .sort();

  if (!starts.length) {
    return {
      hasData: false,
      lastStart: null,
      day: null,
      phase: null,
      nextStart: null,
      daysToNext: null,
      avgLength: defaultAvg,
    };
  }

  // Observed average cycle length from the gaps between starts (fallback to default)
  let avg = defaultAvg;
  if (starts.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) gaps.push(daysBetween(starts[i - 1], starts[i]));
    const reasonable = gaps.filter((g) => g >= 18 && g <= 45);
    if (reasonable.length) avg = Math.round(reasonable.reduce((a, b) => a + b, 0) / reasonable.length);
  }

  const todayKey = dkey(today);
  const lastStart = [...starts].reverse().find((s) => s <= todayKey) ?? starts[starts.length - 1];
  const day = daysBetween(lastStart, todayKey) + 1;
  const phase = phaseForDay(day, avg, periodLength);

  const next = new Date(lastStart + "T00:00:00");
  next.setDate(next.getDate() + avg);
  const nextStart = dkey(next);
  const daysToNext = daysBetween(todayKey, nextStart);

  return { hasData: true, lastStart, day, phase, nextStart, daysToNext, avgLength: avg };
}
