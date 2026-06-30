import type { Plan, BodyLog, NutritionTargets, Recipe, ShoppingCategory } from "./types";
import freeMeals from "../../content/nutrition/free-meals.json";
import exerciseImageIndex from "../../content/knowledge/exercise-images.json";

export const FREE_MEALS = freeMeals;

// free-exercise-db (yuhonas/free-exercise-db, public domain) trimmed to just
// what we need to build image URLs: name, id (the CDN folder), and how many
// numbered images that exercise has.
type ExerciseImageEntry = { name: string; id: string; n: number };
const EXERCISE_IMAGE_INDEX = exerciseImageIndex as ExerciseImageEntry[];

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
  const match = findMatch(name);
  if (!match) return [];
  return Array.from({ length: match.n }, (_, i) =>
    `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${match.id}/${i}.jpg`
  );
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
