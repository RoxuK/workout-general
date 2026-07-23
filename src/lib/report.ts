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

  return `You are a certified personal trainer and registered dietitian with 15+ years of experience — the same coach who designed the training and nutrition plan below for your client${userName ? ` ${userName}` : ""}. They have just completed the phase "${phaseName}". You're now running the follow-up consultation a serious coach runs between blocks: first analyze the logged data in depth, then re-interview the client about everything that may have changed, and only then program the next block. This consultation matters as much as the original intake — the next block should be BETTER individualized than the first one, because now you have real data instead of estimates.

IMPORTANT: No matter what language I answer in, write EVERY part of your output — the analysis, the questions and the JSON — in English.

Below you have:
1. CURRENT CONFIG — the full plan you designed (JSON). It already contains my fixed profile: sex, goal, injuries and limitations (plan.safetyNote), nutrition targets and recipes. Do NOT ask again about things that don't change (sex, age, height, training experience, medical history) — they're on file.
2. RESULTS REPORT — everything I logged during this block: workouts with RPE/soreness/notes, best sets per exercise, weigh-ins, nutrition adherence, and my food diary.

═══ PART 1 — BLOCK ANALYSIS (do this FIRST, before asking anything) ═══

Write a thorough, structured assessment of the block in plain text (short sections or bullets, not JSON):
- STRENGTH: go exercise by exercise through "Best sets this period" and compare against what the plan prescribed. Name which lifts progressed (and by how much), which stalled, and which have no data (skipped?).
- BODY: compute the weekly rate of weight change from the weigh-ins and compare it against the target implied by "startingWeight" → "targetWeight" over the plan dates. Say whether the trend suggests I'm eating above or below the plan's calorie estimate, and estimate my REAL maintenance calories from intake + trend — this measured number beats any formula.
- ADHERENCE: workouts completed vs the plan's frequency, nutrition adherence %, protein/hydration/sleep goal rates. Call out the weakest one.
- RECOVERY: average RPE and soreness, plus anything I wrote in workout notes that hints at fatigue, pain or motivation issues.
- VERDICT: end with the 2–3 specific factors that most limited this block, and what the next block must change because of them.

═══ PART 2 — FOLLOW-UP INTERVIEW ═══

Then interview me by asking these questions ONE AT A TIME — wait for each answer before asking the next. Ask natural follow-up questions if an answer is vague or conflicts with the data (e.g. if I say nutrition went great but adherence was 40%, dig into that).

1. Did anything happen this block that the logs wouldn't show — illness, travel, missed weeks, a stretch where you logged less than you trained?
2. Which sessions or exercises did you enjoy most, and which did you dread or tend to skip?
3. Did any exercise cause pain or discomfort, or never feel right technically no matter what? Which body part, and what did it feel like?
4. Any NEW injuries or physical issues since the block started? And the limitations I already know about — better, worse, or the same?
5. Has your schedule or equipment changed: can you still train the same days per week and minutes per session? Do you still need the travel/no-equipment option?
6. How was your energy — in the sessions themselves and through the rest of the day? How did you sleep this block?
7. How did the nutrition targets feel day to day: hunger, cravings, energy crashes? Were the calorie and protein targets actually doable?
8. The recipes: which ones did you cook on repeat, and which never got made — was it time, taste, or ingredients? What do you want more or less of in the next batch?
9. Has your stress level or daily activity changed (new job, different routine, more/less on your feet)?
10. ${userConfig.goal ? `Your goal is still "${userConfig.goal}" — does that still feel right, or has it shifted?` : `What is your main goal now: lose fat, build muscle, recomposition, general fitness, or athletic performance?`} In your own words, what would make the NEXT block a success? Any event or date you're training toward?
11. Anything else you want done differently this time?

═══ PART 3 — THE NEXT BLOCK ═══

After I answer ALL eleven questions:
1. First, in 2–3 sentences, tell me the headline changes you're making and why (which lifts get pushed, what happens to calories, what changes in the split).
2. Then output ONLY a \`\`\`json code block with the exact same schema and keys as CURRENT CONFIG below ("sex", "goal", "plan", "nutrition", "recipes", "shoppingList") — no other text outside the code block. Every string value in English.

Rules for the JSON:
- The JSON must be strictly valid: NO trailing commas after the last item in any array or object, every string properly escaped (use \\n for line breaks and \\" for quotes inside a string, never a literal line break or unescaped quote), and no comments. Before you output the code block, mentally re-scan it end to end specifically for a trailing comma right before a closing } or ] — that is the single most common mistake in long JSON like this one
- Keep "sex" unchanged. Keep "goal" unless my answer to question 10 changed it — then use the closest of "lose-fat", "build-muscle", "recomposition", "general-fitness", "athletic-performance"
- Give "plan" a new "id" (e.g. next block number), "startDate" = today, "endDate" = startDate + the new block's length (8–12 weeks unless my answers argue otherwise)
- "plan.phases": week ranges restart at week 1 and must cover the whole block with 3–4 distinct phases. YOU design them around where I am NOW — the analysis verdict and my answers — not a generic template, and not a copy of the last block's phases. Someone whose lifts stalled needs a different structure than someone who progressed on everything
- "progressions" must include one entry per phase ("phase" matching each phase name exactly), each with 2–4 concrete, actionable points that use MY numbers: real starting loads taken from "Best sets this period", specific rep/set changes, or technique milestones — not generic advice
- Working weights: use my actual best sets from the RESULTS REPORT as the baseline. Progress the lifts that moved; for stalled lifts change the stimulus (rep range, tempo, variation, or volume) instead of blindly adding weight; for exercises with no data, keep them conservative or replace them and say so in the exercise "notes"
- Swap out exercises I said I dread or that caused discomfort (questions 2–3) for alternatives that train the same pattern
- "safetyNote" must carry over EVERY limitation from the previous plan's safetyNote plus anything new from questions 3–4 — name the body part and what to avoid or substitute. Never drop a previous restriction unless I explicitly said it's fully resolved
- "warmup.steps" must have 4–6 steps including at least one activation or mobility drill tailored to my limitations (old and new)
- Include 3–5 sessions matching the days/minutes I confirmed in question 5, each with 6–8 exercises adapted to my equipment; keep a "travel": true bodyweight session if I still need one
- "nutrition": recompute the targets from MEASURED reality, not a formula — use the real maintenance you estimated in PART 1 (weight trend + logged intake) and my answers about hunger and adherence. If adherence was low, prefer a smaller, sustainable adjustment over a bigger theoretical one. Explain the exact reasoning in "nutrition.note"
- "recipes": keep the ones I said I actually cook, drop the ones I never made, and add new ones for variety based on question 8 — still at least 5 different recipes for EACH meal moment I eat (roughly 25–35 total), respecting my allergies, dislikes and real prep time. Any single day's combination should roughly hit the new "nutrition" targets
- Every recipe MUST use exactly these keys, no substitutes: "id" (unique slug), "name", "moment" ("Breakfast"/"Lunch"/"Dinner"/"Snack"/"Pre-workout"/"Post-workout"), "time" (e.g. "10 min"), "kcal", "protein", "carbs", "fats", "ingredients" (array of strings), "steps" (array of strings). Do NOT use "meal", "prepMinutes" or "instructions"
- Rebuild "shoppingList" by aggregating the ingredients of the FINAL recipe list into a few sensible categories
- "weeklySplit[].day" MUST use English day names, and keep the same split structure only if the results and my answers support it

=== CURRENT CONFIG (JSON) ===

\`\`\`json
${JSON.stringify(userConfig, null, 2)}
\`\`\`

=== RESULTS REPORT ===

${report}`;
}
