import type { WorkoutLog, BodyLog, NutritionLog, Plan, FreeMeal, Recipe } from "./types";
import { planWeek, effectiveStartingWeight, latestWeight } from "./content";
import { parseTimeSec } from "./utils";

function fmt(d: string) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function setStr(s?: { kg: number | ""; reps: number | "" }, timed?: boolean) {
  if (!s) return "";
  if (s.kg === "" && s.reps === "") return "";
  if (timed) return s.reps === "" ? "" : `${s.reps} s`;
  const kg = s.kg === "" ? "" : s.kg;
  const reps = s.reps === "" ? "" : s.reps;
  return `${kg} x ${reps}`;
}

export type ExportOpts = {
  plan: Plan;
  planStart: string | null;
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutrition: Record<string, NutritionLog>;
  freeMeals?: Record<string, FreeMeal[]>;
  recipes?: Recipe[];
  recipesEaten?: Record<string, string[]>;
};

/**
 * Generates and downloads a .xlsx with Weigh-ins, Workouts and Nutrition sheets.
 */
export async function exportExcel(opts: ExportOpts) {
  const XLSX = await import("xlsx");
  const { plan, planStart, workouts, bodyLogs, nutrition } = opts;
  const freeMeals = opts.freeMeals ?? {};
  const recipesEaten = opts.recipesEaten ?? {};
  const recipeById = new Map((opts.recipes ?? []).map((r) => [r.id, r]));
  const wb = XLSX.utils.book_new();

  // ── Summary ──────────────────────────────────────────────────────────────
  const baseWeight = effectiveStartingWeight(plan, bodyLogs, planStart);
  const lastWeight = latestWeight(bodyLogs) ?? baseWeight;
  const lost = +(baseWeight - lastWeight).toFixed(1);
  const nutVals = Object.values(nutrition);
  const clean = nutVals.filter((n) => n.cleanDay).length;
  const adherence = nutVals.length ? Math.round((clean / nutVals.length) * 100) : 0;
  const summary = [
    ["TRAINING PLAN — Summary", null],
    ["Plan", plan.name],
    ["Plan start", planStart ? fmt(planStart) : fmt(plan.startDate)],
    ["Exported", fmt(new Date().toISOString())],
    [null, null],
    ["Starting weight (kg)", baseWeight],
    ["Target weight (kg)", plan.targetWeight],
    ["Latest weight (kg)", lastWeight],
    ["Kg lost", lost],
    ["Current week", planWeek(plan, new Date(), planStart)],
    ["Sessions logged", workouts.length],
    ["Weigh-ins logged", bodyLogs.length],
    ["Nutrition days logged", nutVals.length],
    ["Nutrition adherence (%)", adherence],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

  // ── Weigh-ins ────────────────────────────────────────────────────────────
  const weightHdr = [
    "Week", "Date", "Weight (kg)", "Waist (cm)", "Hip (cm)", "Chest (cm)",
    "Arm (cm)", "Thigh (cm)", "Body fat %", "Muscle mass (kg)",
    "Visceral fat", "Water %", "Weight change", "Notes",
  ];
  const sorted = [...bodyLogs].sort((a, b) => (a.date < b.date ? -1 : 1));
  let prevWeight: number | null = null;
  const weightRows = sorted.map((b) => {
    const weight = b.weight === "" ? null : Number(b.weight);
    const change = weight != null && prevWeight != null ? +(weight - prevWeight).toFixed(1) : "";
    if (weight != null) prevWeight = weight;
    return [
      planWeek(plan, new Date(b.date), planStart),
      fmt(b.date), b.weight, b.waist, b.hip, b.chest,
      b.arm, b.thigh, b.bodyFat, b.muscleMass ?? "", b.visceralFat ?? "", b.water ?? "", change, b.notes,
    ];
  });
  const wsWeight = XLSX.utils.aoa_to_sheet([weightHdr, ...weightRows]);
  wsWeight["!cols"] = [{ wch: 7 }, { wch: 11 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 13 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsWeight, "Weigh-ins");

  // ── Workouts ─────────────────────────────────────────────────────────────
  const workoutHdr = [
    "Date", "Session", "Exercise", "Set 1 (kg x reps)", "Set 2 (kg x reps)",
    "Set 3 (kg x reps)", "Set 4 (kg x reps)", "RPE (1-10)", "Soreness (1-5)", "Notes",
  ];
  // Exercise names held for time (planks, hollow body hold...) — logged in
  // seconds, so "kg x reps" doesn't mean anything for these rows.
  const timedExercises = new Set<string>();
  for (const sess of plan.sessions) {
    for (const ex of sess.exercises) {
      if (parseTimeSec(ex.reps) != null) timedExercises.add(ex.name);
    }
  }

  const wk = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));
  const workoutRows: any[][] = [];
  for (const w of wk) {
    w.exercises.forEach((e, idx) => {
      const timed = timedExercises.has(e.name);
      workoutRows.push([
        idx === 0 ? fmt(w.date) : "",
        idx === 0 ? w.sessionName : "",
        e.name,
        setStr(e.sets[0], timed), setStr(e.sets[1], timed), setStr(e.sets[2], timed), setStr(e.sets[3], timed),
        idx === 0 ? (w.rpe ?? "") : "",
        idx === 0 ? (w.soreness ?? "") : "",
        idx === 0 ? w.notes : "",
      ]);
    });
  }
  const wsWorkouts = XLSX.utils.aoa_to_sheet([workoutHdr, ...workoutRows]);
  wsWorkouts["!cols"] = [{ wch: 11 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsWorkouts, "Workouts");

  // ── Nutrition ────────────────────────────────────────────────────────────
  const nutHdr = [
    "Date", "Calories eaten", "Protein (g)", "Ate out", "Hydration",
    "Sleep", "Cravings", "Clean day (✓/✗)", "Meals logged", "Notes",
  ];
  const days = Array.from(new Set([...Object.keys(nutrition), ...Object.keys(freeMeals), ...Object.keys(recipesEaten)])).sort();
  const nutRows = days.map((d) => {
    const log = nutrition[d];
    let kcal = 0, prot = 0;
    const names: string[] = [];
    for (const id of recipesEaten[d] || []) {
      const r = recipeById.get(id);
      if (!r) continue;
      kcal += r.kcal;
      prot += r.protein;
      names.push(r.name);
    }
    for (const x of freeMeals[d] || []) {
      kcal += x.kcal;
      prot += x.p;
      names.push(x.name);
    }
    return [
      fmt(d),
      kcal || "",
      prot || "",
      log?.ateOut ? "Yes" : "",
      log?.hydrationGoalMet ? "Met" : "",
      log?.sleepGoalMet ? "Met" : "",
      log?.craving ? "Yes" : "",
      log ? (log.cleanDay ? "✓" : "✗") : "",
      names.join(" · "),
      log?.notes || "",
    ];
  });
  const wsNut = XLSX.utils.aoa_to_sheet([nutHdr, ...nutRows]);
  wsNut["!cols"] = [{ wch: 11 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsNut, "Nutrition");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `training-log_${date}.xlsx`);
}
