// Markdown report builder (shared by the Reports page and the phase handoff)
// plus the phase-handoff package: continuation prompt + current config JSON +
// results report, copied as one text into an AI chat to prepare the next block.

import type { Plan, WorkoutLog, BodyLog, NutritionLog, Recipe, FreeMeal, UserConfig } from "./types";
import { effectiveStartingWeight, effectiveStartDate, latestWeight, lastEndedPhase, currentPhase } from "./content";
import { bestSet, fmtDate, parseTimeSec, isBodyweightOnly } from "./utils";

export type ReportData = {
  plan: Plan;
  planStart: string | null;
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutrition: Record<string, NutritionLog>;
  freeMeals: Record<string, FreeMeal[]>;
  recipes: Recipe[];
  recipesEaten: Record<string, string[]>;
};

export function buildReportMd(data: ReportData, since: Date, periodLabel: string): string {
  const { plan, planStart, workouts, bodyLogs, nutrition, freeMeals, recipes, recipesEaten } = data;

  const wk = workouts.filter((w) => new Date(w.date) >= since);
  const bl = bodyLogs.filter((b) => new Date(b.date) >= since);
  const nut = Object.values(nutrition).filter((n) => new Date(n.date) >= since);

  const baseWeight = effectiveStartingWeight(plan, bodyLogs, planStart);
  const lastWeight = latestWeight(bodyLogs);
  const totalLost = lastWeight != null ? baseWeight - lastWeight : 0;

  const cleanDays = nut.filter((n) => n.cleanDay).length;
  const adherence = nut.length ? Math.round((cleanDays / nut.length) * 100) : 0;
  const sorenessVals = wk.filter((w) => w.soreness != null).map((w) => w.soreness as number);
  const sorenessAvg = sorenessVals.length
    ? (sorenessVals.reduce((a, b) => a + b, 0) / sorenessVals.length).toFixed(1)
    : "—";
  const rpeVals = wk.filter((w) => w.rpe != null).map((w) => w.rpe as number);
  const rpeAvg = rpeVals.length
    ? (rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length).toFixed(1)
    : "—";

  // Exercise names held for time (planks, hollow body hold...) or done
  // bodyweight-only (push-ups, mountain climbers...), detected from the
  // active plan's reps field / exercise name — "0 kg x reps" doesn't mean
  // anything for either, and comparisons/ranking use reps, not kg.
  const timedExercises = new Set<string>();
  const bodyweightExercises = new Set<string>();
  for (const sess of plan.sessions) {
    for (const ex of sess.exercises) {
      if (parseTimeSec(ex.reps) != null) timedExercises.add(ex.name);
      else if (isBodyweightOnly(ex.name)) bodyweightExercises.add(ex.name);
    }
  }
  const usesReps = (name: string) => timedExercises.has(name) || bodyweightExercises.has(name);

  // Best sets per exercise in the period
  const prMap = new Map<string, { kg: number; reps: number }>();
  for (const w of wk) {
    for (const e of w.exercises) {
      const b = bestSet(e.sets);
      if (!b) continue;
      const cur = prMap.get(e.name);
      const better = !cur || (usesReps(e.name) ? b.reps > cur.reps : b.kg > cur.kg);
      if (better) prMap.set(e.name, b);
    }
  }

  const L: string[] = [];
  L.push(`# Training report`);
  L.push(`**Period:** ${periodLabel} · generated ${fmtDate(new Date().toISOString())}`);
  L.push(`**Plan:** ${plan.name}`);
  L.push(``);
  L.push(`## Weight and composition`);
  L.push(`- Starting weight: **${baseWeight} kg** · target **${plan.targetWeight} kg**`);
  L.push(`- Latest weight: **${lastWeight != null ? lastWeight + " kg" : "not logged"}**`);
  L.push(`- Total lost: **${totalLost > 0 ? "−" + totalLost.toFixed(1) + " kg" : "—"}**`);
  if (bl.length) {
    L.push(`- Weigh-ins in this period:`);
    bl.forEach((b) => L.push(`  - ${fmtDate(b.date)}: ${b.weight !== "" ? b.weight + " kg" : "—"}${b.waist !== "" ? `, waist ${b.waist} cm` : ""}${b.bodyFat !== "" ? `, body fat ${b.bodyFat}%` : ""}`));
  }
  L.push(``);
  L.push(`## Workouts (${wk.length})`);
  L.push(`- Average RPE: **${rpeAvg}** · Average soreness rating: **${sorenessAvg}/5**`);
  if (wk.length) {
    wk.forEach((w) => {
      L.push(`- **${fmtDate(w.date)} · ${w.sessionName}** — RPE ${w.rpe ?? "—"}, soreness ${w.soreness ?? "—"}/5${w.notes ? ` — _${w.notes}_` : ""}`);
    });
  } else {
    L.push(`- No workouts logged in this period.`);
  }
  L.push(``);
  if (prMap.size) {
    L.push(`## Best sets this period`);
    Array.from(prMap.entries())
      .sort((a, b) => {
        const av = usesReps(a[0]) ? a[1].reps : a[1].kg;
        const bv = usesReps(b[0]) ? b[1].reps : b[1].kg;
        return bv - av;
      })
      .forEach(([n, b]) => {
        const label = timedExercises.has(n)
          ? `${b.reps} s`
          : bodyweightExercises.has(n)
          ? `${b.reps} reps`
          : `${b.kg} kg × ${b.reps}`;
        L.push(`- ${n}: **${label}**`);
      });
    L.push(``);
  }
  L.push(`## Nutrition`);
  L.push(`- Days logged: ${nut.length} · clean days: ${cleanDays}`);
  L.push(`- **Adherence: ${adherence}%**`);
  L.push(`- Protein met: ${nut.filter((n) => n.proteinGoalMet).length}/${nut.length} · Hydration met: ${nut.filter((n) => n.hydrationGoalMet).length}/${nut.length} · Sleep met: ${nut.filter((n) => n.sleepGoalMet).length}/${nut.length}`);
  L.push(`- Cravings: ${nut.filter((n) => n.craving).length}`);
  L.push(``);

  // Food diary (recipes + free meals)
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const diaryDays = Array.from(new Set([...Object.keys(freeMeals), ...Object.keys(recipesEaten)]))
    .filter((date) => new Date(date) >= since && ((freeMeals[date]?.length ?? 0) > 0 || (recipesEaten[date]?.length ?? 0) > 0))
    .sort((a, b) => (a > b ? -1 : 1));

  if (diaryDays.length > 0) {
    L.push(`## Food diary`);
    for (const date of diaryDays) {
      const meals = freeMeals[date] ?? [];
      const eatenRecipes = (recipesEaten[date] ??  []).map((id) => recipeById.get(id)).filter((r): r is NonNullable<typeof r> => !!r);
      const totalKcal = meals.reduce((s, x) => s + x.kcal, 0) + eatenRecipes.reduce((s, r) => s + r.kcal, 0);
      const totals = [
        ...meals.map((x) => ({ p: x.p, c: x.c, g: x.g })),
        ...eatenRecipes.map((r) => ({ p: r.protein, c: r.carbs, g: r.fats })),
      ].reduce((acc, x) => ({ p: acc.p + x.p, c: acc.c + x.c, g: acc.g + x.g }), { p: 0, c: 0, g: 0 });
      L.push(`### ${fmtDate(date)} · ${Math.round(totalKcal)} kcal · ${totals.p}P/${totals.c}C/${totals.g}G`);
      const items = [
        ...eatenRecipes.map((r) => `${r.name} (${r.kcal} kcal · ${r.protein}P/${r.carbs}C/${r.fats}G)`),
        ...meals.map((x) => `${x.name} (${x.kcal} kcal · ${x.p}P/${x.c}C/${x.g}G)`),
      ];
      L.push(`- ${items.join(", ")}`);
    }
    L.push(``);
  }

  L.push(`---`);
  L.push(`_Use this to adjust load, calories and the next phase._`);
  return L.join("\n");
}

// ─── Phase handoff ───────────────────────────────────────────────────────────

// One self-contained text the user pastes into any AI chat: the coach role +
// task, the full current config (so nothing from the intake interview is
// lost — injuries, goal, nutrition, recipes), and the results of the block so
// far. The AI answers with a new config JSON in the same schema, which the
// user pastes back into the "import next phase" block in Progress.
export function buildHandoffText(userConfig: UserConfig, userName: string | null, data: ReportData): string {
  const { plan, planStart } = data;
  const ended = lastEndedPhase(plan, planStart);
  const phaseName = ended?.name ?? currentPhase(plan, new Date(), planStart) ?? plan.phases[0]?.name ?? "the current block";
  const since = new Date(effectiveStartDate(plan, planStart));
  since.setHours(0, 0, 0, 0);
  const report = buildReportMd(data, since, `current block, since ${fmtDate(since.toISOString())}`);

  return `You are a certified personal trainer and registered dietitian with 15+ years of experience — the same coach who designed the training and nutrition plan below for your client${userName ? ` ${userName}` : ""}. They have just completed the phase "${phaseName}" and need the next training block.

IMPORTANT: No matter what language I answer in, write EVERY part of your output — the assessment and the JSON — in English.

Below you have:
1. CURRENT CONFIG — the full plan you designed (JSON). It already contains my profile: sex, goal, injuries and limitations (plan.safetyNote), nutrition targets and recipes. Do NOT re-run a full intake interview.
2. RESULTS REPORT — everything I logged during this block: workouts, best sets per exercise, weight trend, nutrition adherence, RPE and soreness.

Do this, in order:
1. Write a short assessment (3–5 sentences, plain text) of how the block went: strength progression vs the plan, weight trend vs the goal, adherence, recovery.
2. Ask me a few short questions ONE AT A TIME, only about what may have changed: new pain or injuries, equipment or schedule changes, how the nutrition felt, anything I want done differently. Wait for each answer.
3. Then design the NEXT block and output ONLY a \`\`\`json code block with the exact same schema and keys as CURRENT CONFIG below ("sex", "goal", "plan", "nutrition", "recipes", "shoppingList").

Rules for the JSON:
- The JSON must be strictly valid: NO trailing commas after the last item in any array or object, every string properly escaped (use \\n for line breaks and \\" for quotes inside a string, never a literal line break or unescaped quote), and no comments. Before you output the code block, mentally re-scan it end to end specifically for a trailing comma right before a closing } or ] — that is the single most common mistake in long JSON like this one
- Keep "sex" and "goal" unchanged unless I tell you otherwise
- Give "plan" a new "id" (e.g. next block number), "startDate" = today, "endDate" = startDate + the new block's length
- "plan.phases" week ranges restart at week 1 (e.g. "1–2"), covering the whole new block; include one "progressions" entry per phase
- Use my actual best sets from the RESULTS REPORT as the baseline for the new working weights — progress them, don't reset them
- Carry over and respect every limitation from the previous plan's "safetyNote", plus anything new I tell you
- Adjust "nutrition" from the real weight trend in the report, and say why in "nutrition.note"
- Keep the same "weeklySplit" structure unless the results or my answers argue for a change
- You may reuse recipes from CURRENT CONFIG verbatim; add or swap some if I ask for variety. Rebuild "shoppingList" from the final recipe list

=== CURRENT CONFIG (JSON) ===

\`\`\`json
${JSON.stringify(userConfig, null, 2)}
\`\`\`

=== RESULTS REPORT ===

${report}`;
}
