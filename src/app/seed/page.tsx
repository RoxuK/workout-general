"use client";

// DEV-ONLY page: loads realistic test data to review the app on localhost.
// Does nothing in production. Seeds against whatever plan is currently
// active in the store (the result of onboarding), with generic synthetic
// weights since there's no fixed exercise list to key off anymore.

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Trash2, Check, Home } from "lucide-react";
import { useStore } from "@/lib/store";
import type { BodyLog, NutritionLog, WorkoutLog } from "@/lib/types";
import { dayKey, uid } from "@/lib/utils";

function daysAgo(n: number, hour = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
}

function buildDemo(plan: ReturnType<typeof useStore.getState>["userConfig"]) {
  const sessions = plan?.plan.sessions.filter((s) => !s.travel) ?? [];

  // ── Workouts: 3 weeks back with a +2.5 kg/week progression ───────────────
  const workouts: WorkoutLog[] = [];
  if (sessions.length) {
    for (let ago = 21; ago >= 1; ago--) {
      const date = daysAgo(ago, 18, 30);
      const dow = date.getDay();
      const session = sessions[dow % sessions.length];
      if (!session || dow === 0 || dow === 3) continue; // skip a couple of rest-ish days

      const week = Math.floor((21 - ago) / 7); // 0, 1, 2
      const w: WorkoutLog = {
        id: uid(),
        date: date.toISOString(),
        sessionId: session.id,
        sessionName: session.name,
        exercises: session.exercises.map((ej, i) => {
          const base = 10 + i * 4; // generic synthetic starting weight
          const kg = base + week * 2.5;
          const reps = parseInt(ej.reps, 10) || 10;
          return {
            name: ej.name,
            sets: Array.from({ length: ej.sets }, (_, si) => ({
              kg,
              reps: week === 2 && si === ej.sets - 1 ? reps + 1 : reps,
            })),
          };
        }),
        rpe: week === 0 ? 7 : 8,
        soreness: ago % 3 === 0 ? 5 : 4,
        notes: "",
      };
      workouts.push(w);
    }
  }

  // ── Weigh-ins: every 3 days, 86.0 → 84.5 kg ───────────────────────────────
  const weights = [86.0, 85.7, 85.5, 85.3, 85.0, 84.9, 84.7, 84.5];
  const bodyLogs: BodyLog[] = weights.map((weight, i) => {
    const date = daysAgo(21 - i * 3, 8, 0);
    const full = i === 0 || i === weights.length - 1;
    return {
      id: uid(),
      date: date.toISOString(),
      weight,
      waist: full || i % 2 === 0 ? +(99 - i * 0.3).toFixed(1) : "",
      hip: full ? 104 : "",
      chest: full ? (i === 0 ? 106 : 105.5) : "",
      arm: full ? 33 : "",
      thigh: full ? 60 : "",
      bodyFat: full ? +(28 - i * 0.1).toFixed(1) : "",
      notes: i === 0 ? "Block start" : "",
    };
  });

  // ── Nutrition: last 14 days ───────────────────────────────────────────────
  const nutrition: Record<string, NutritionLog> = {};
  for (let ago = 13; ago >= 0; ago--) {
    const k = dayKey(daysAgo(ago));
    const ateOut = ago === 10 || ago === 3;
    nutrition[k] = {
      date: k,
      proteinGoalMet: ago !== 10,
      ateOut,
      hydrationGoalMet: ago % 3 !== 2,
      sleepGoalMet: ago % 4 !== 3,
      craving: ago === 7,
      cleanDay: !ateOut && ago !== 7,
      notes: "",
    };
  }

  // ── Schedule: today gets whatever's next in the rotation ──────────────────
  const schedule: Record<string, string> = {};
  if (sessions.length) {
    const todayDow = new Date().getDay();
    schedule[dayKey()] = sessions[todayDow % sessions.length].id;
  }

  return {
    workouts,
    bodyLogs,
    nutrition,
    planStart: dayKey(daysAgo(21)),
    schedule,
  };
}

export default function Seed() {
  const userConfig = useStore((s) => s.userConfig);
  const importData = useStore((s) => s.importData);
  const clearAll = useStore((s) => s.clearAll);
  const [done, setDone] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="pt-10 text-center">
        <p className="text-muted">This page only exists in development.</p>
        <Link href="/" className="btn-ghost mt-4 inline-flex">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up pt-6">
      <h1 className="font-display text-3xl">Test data</h1>
      <p className="mt-1 text-sm text-muted">
        Loads 3 weeks of sample logs (progressive workouts, weigh-ins, nutrition)
        against your current plan so you can review the app with real content.
      </p>
      {!userConfig && (
        <p className="mt-2 text-xs text-warn">No plan set yet — complete onboarding first to get workout data too.</p>
      )}

      <button
        onClick={() => {
          importData(buildDemo(userConfig));
          setDone(true);
        }}
        className="btn-accent mt-6 w-full gap-2"
      >
        {done ? <Check size={18} /> : <FlaskConical size={18} />}
        {done ? "Data loaded ✓" : "Load test data"}
      </button>

      <button
        onClick={() => {
          if (confirm("Delete ALL local records?")) {
            clearAll();
            setDone(false);
          }
        }}
        className="btn mt-3 w-full justify-center gap-2 border border-bad/40 bg-bad/10 text-bad"
      >
        <Trash2 size={16} /> Clear all data
      </button>

      {done && (
        <Link href="/" className="btn-ghost mt-3 w-full gap-2">
          <Home size={16} /> Go home and check
        </Link>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        Overwrites whatever was there. Use &quot;Clear&quot; before using the app for real.
      </p>
    </div>
  );
}
