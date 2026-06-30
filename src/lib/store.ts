"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkoutLog, BodyLog, NutritionLog, Reminder, FreeMeal, UserConfig, CycleLog } from "./types";
import { dayKey } from "./utils";

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "workout", label: "Time to train 🏋️", body: "Today's session is waiting. Let's go!", emoji: "🏋️", time: "18:00", enabled: true },
  { id: "vitd", label: "Vitamin D + Omega-3 ☀️", body: "Take them with breakfast.", emoji: "☀️", time: "08:00", enabled: true },
  { id: "creatine", label: "Creatine + Protein ⚡", body: "5 g of creatine and your post-workout shake.", emoji: "⚡", time: "19:30", enabled: true },
  { id: "magnesium", label: "Magnesium 🌙", body: "For recovery and better sleep.", emoji: "🌙", time: "22:30", enabled: true },
  { id: "water", label: "Hydration 💧", body: "On track with your water for today?", emoji: "💧", time: "13:00", enabled: false },
  { id: "mobility", label: "Mobility work 🧘", body: "5 min: hip flexors, cat-cow, rotations.", emoji: "🧘", time: "21:00", enabled: false },
  { id: "checkin", label: "Weekly check-in ⚖️", body: "Weigh in and log your measurements: 2 minutes, done.", emoji: "⚖️", time: "09:00", enabled: false, weekday: 1, url: "/checkin" },
];

type State = {
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutrition: Record<string, NutritionLog>; // by dayKey
  freeMeals: Record<string, FreeMeal[]>;   // dayKey -> off-plan meals logged that day
  recipesEaten: Record<string, string[]>;  // dayKey -> recipe ids marked eaten that day
  planStart: string | null;                // YYYY-MM-DD — real date the user starts the plan
  schedule: Record<string, string>;        // dayKey -> sessionId the user decides to train that day
  cycles: CycleLog[];                      // menstrual cycle log (shown only for sex: "female")
  cycleAvgLength: number;                  // days, observed or default estimate
  periodLength: number;                    // days
  _hydrated: boolean;

  addWorkout: (w: WorkoutLog) => void;
  updateWorkout: (id: string, patch: Partial<WorkoutLog>) => void;
  deleteWorkout: (id: string) => void;
  lastWorkoutFor: (sessionId: string) => WorkoutLog | undefined;

  addBody: (b: BodyLog) => void;
  updateBody: (id: string, patch: Partial<BodyLog>) => void;
  deleteBody: (id: string) => void;
  lastBody: () => BodyLog | undefined;

  setNutritionLog: (n: NutritionLog) => void;
  getNutritionLog: (day?: string) => NutritionLog | undefined;

  addFreeMeal: (date: string, item: FreeMeal) => void;
  removeFreeMeal: (date: string, id: string) => void;

  toggleRecipeEaten: (date: string, recipeId: string) => void;

  setPlanStart: (date: string | null) => void;

  setSchedule: (date: string, sessionId: string | null) => void;

  addCycle: (c: CycleLog) => void;
  deleteCycle: (id: string) => void;
  setCycleSettings: (patch: Partial<Pick<State, "cycleAvgLength" | "periodLength">>) => void;

  lang: "es" | "en";
  setLang: (l: "es" | "en") => void;

  reminders: Reminder[];
  updateReminder: (id: string, patch: Partial<Reminder>) => void;

  importData: (data: Partial<Pick<State, "workouts" | "bodyLogs" | "nutrition" | "freeMeals" | "recipesEaten" | "planStart" | "schedule" | "cycles">>) => void;
  clearAll: () => void;

  userName: string | null;
  userConfig: UserConfig | null;
  setUserName: (name: string) => void;
  setUserConfig: (config: UserConfig) => void;
  resetUser: () => void;
};

const empty = { workouts: [], bodyLogs: [], nutrition: {}, freeMeals: {}, recipesEaten: {}, planStart: null, schedule: {}, cycles: [] as CycleLog[] };
const emptyUser = { userName: null, userConfig: null };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      ...emptyUser,
      cycleAvgLength: 28,
      periodLength: 5,
      lang: "en",
      setLang: (l) => set({ lang: l }),
      reminders: DEFAULT_REMINDERS,
      _hydrated: false,

      addWorkout: (w) =>
        set((s) => ({ workouts: [w, ...s.workouts].sort(byDateDesc) })),
      updateWorkout: (id, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)).sort(byDateDesc),
        })),
      deleteWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      lastWorkoutFor: (sessionId) =>
        get().workouts.find((w) => w.sessionId === sessionId),

      addBody: (b) =>
        set((s) => ({ bodyLogs: [b, ...s.bodyLogs].sort(byDateDesc) })),
      updateBody: (id, patch) =>
        set((s) => ({
          bodyLogs: s.bodyLogs.map((b) => (b.id === id ? { ...b, ...patch } : b)).sort(byDateDesc),
        })),
      deleteBody: (id) =>
        set((s) => ({ bodyLogs: s.bodyLogs.filter((b) => b.id !== id) })),
      lastBody: () => get().bodyLogs[0],

      setNutritionLog: (n) =>
        set((s) => ({ nutrition: { ...s.nutrition, [n.date]: n } })),
      getNutritionLog: (day = dayKey()) => get().nutrition[day],

      addFreeMeal: (date, item) =>
        set((s) => ({
          freeMeals: { ...s.freeMeals, [date]: [...(s.freeMeals[date] ?? []), item] },
        })),
      removeFreeMeal: (date, id) =>
        set((s) => ({
          freeMeals: {
            ...s.freeMeals,
            [date]: (s.freeMeals[date] ?? []).filter((x) => x.id !== id),
          },
        })),

      toggleRecipeEaten: (date, recipeId) =>
        set((s) => {
          const cur = s.recipesEaten[date] ?? [];
          const next = cur.includes(recipeId) ? cur.filter((id) => id !== recipeId) : [...cur, recipeId];
          return { recipesEaten: { ...s.recipesEaten, [date]: next } };
        }),

      setPlanStart: (date) => set({ planStart: date }),

      setSchedule: (date, sessionId) =>
        set((s) => {
          const next = { ...s.schedule };
          if (sessionId === null) delete next[date];
          else next[date] = sessionId;
          return { schedule: next };
        }),

      updateReminder: (id, patch) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      addCycle: (c) =>
        set((s) => ({ cycles: [c, ...s.cycles].sort((a, b) => (a.start < b.start ? 1 : -1)) })),
      deleteCycle: (id) =>
        set((s) => ({ cycles: s.cycles.filter((c) => c.id !== id) })),
      setCycleSettings: (patch) => set(patch),

      importData: (data) =>
        set((s) => ({
          workouts: (data.workouts ?? s.workouts).slice().sort(byDateDesc),
          bodyLogs: (data.bodyLogs ?? s.bodyLogs).slice().sort(byDateDesc),
          nutrition: data.nutrition ?? s.nutrition,
          freeMeals: data.freeMeals ?? s.freeMeals,
          recipesEaten: data.recipesEaten ?? s.recipesEaten,
          planStart: data.planStart !== undefined ? data.planStart : s.planStart,
          schedule: data.schedule ?? s.schedule,
          cycles: data.cycles ?? s.cycles,
        })),
      clearAll: () => set({ ...empty }),

      setUserName: (name) => set({ userName: name }),
      setUserConfig: (config) => set({ userConfig: config }),
      resetUser: () => set({ ...empty, ...emptyUser }),
    }),
    {
      name: "roxu-fit-v1",
      version: 4,
      // v3 renamed every field from Spanish to English (fecha -> date, etc.).
      // v4 renamed WorkoutLog.lowerBack -> soreness and added recipesEaten.
      // Older persisted data isn't shape-compatible, so start fresh instead
      // of carrying over now-mismatched keys.
      migrate: (persisted: any, version) => {
        if (version < 4) return { reminders: DEFAULT_REMINDERS };
        if (persisted?.reminders) {
          const ids = new Set(persisted.reminders.map((r: any) => r.id));
          for (const d of DEFAULT_REMINDERS) {
            if (!ids.has(d.id)) persisted.reminders.push(d);
          }
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state._hydrated = true;
      },
    }
  )
);

function byDateDesc(a: { date: string }, b: { date: string }) {
  return a.date < b.date ? 1 : -1;
}
