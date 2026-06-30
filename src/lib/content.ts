import type { Plan, BodyLog, NutritionTargets } from "./types";
import freeMeals from "../../content/nutrition/free-meals.json";
import exerciseImages from "../../content/knowledge/ejercicios-imagenes.json";

export const FREE_MEALS = freeMeals;

// Exercise name -> reference images (free-exercise-db, open license).
// Keyed by the exact exercise name from a plan, so it only matches when the
// onboarding-generated plan happens to reuse a name from the source dataset.
export const EXERCISE_IMAGES: Record<string, { fuente: string | null; imagenes: string[] }> =
  exerciseImages as any;

export function imagesFor(name: string) {
  return EXERCISE_IMAGES[name]?.imagenes ?? [];
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
