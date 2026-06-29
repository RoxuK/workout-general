"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WorkoutLog, BodyLog, NutricionLog, Reminder, ComidaLibre } from "./types";
import { dayKey } from "./utils";

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "entreno", label: "Hora de entrenar 🏋️", body: "Tu sesión de hoy te espera. ¡Vamos!", emoji: "🏋️", time: "18:00", enabled: true },
  { id: "vitd", label: "Vitamina D + Omega-3 ☀️", body: "Tómalas con el desayuno.", emoji: "☀️", time: "08:00", enabled: true },
  { id: "creatina", label: "Creatina + Proteína ⚡", body: "5 g de creatina y tu batido post-entreno.", emoji: "⚡", time: "19:30", enabled: true },
  { id: "magnesio", label: "Magnesio 🌙", body: "Para recuperar y dormir mejor.", emoji: "🌙", time: "22:30", enabled: true },
  { id: "agua", label: "Hidratación 💧", body: "¿Vas por buen camino con los 3 L de agua?", emoji: "💧", time: "13:00", enabled: false },
  { id: "movilidad", label: "Movilidad lumbar 🧘", body: "5 min: psoas, gato-vaca, rotaciones. Sobre todo si hoy hubo shibari.", emoji: "🧘", time: "21:00", enabled: false },
  { id: "checkin", label: "Check-in semanal ⚖️", body: "Pésate y apunta tus medidas: 2 minutos y listo.", emoji: "⚖️", time: "09:00", enabled: false, weekday: 1, url: "/checkin" },
];

type State = {
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutricion: Record<string, NutricionLog>; // por dayKey
  comidasDia: Record<string, string[]>;    // dayKey → [recipeId, ...] recetas comidas ese día
  comidasLibres: Record<string, ComidaLibre[]>; // dayKey → comidas fuera del recetario
  suplementosDia: Record<string, string[]>; // dayKey → [momento, ...] tomas marcadas ese día
  planStart: string | null;                 // YYYY-MM-DD — fecha real en que Roxu empieza el plan
  agenda: Record<string, string>;           // dayKey → sesionId que Roxu decide entrenar ese día
  _hydrated: boolean;

  addWorkout: (w: WorkoutLog) => void;
  updateWorkout: (id: string, patch: Partial<WorkoutLog>) => void;
  deleteWorkout: (id: string) => void;
  lastWorkoutFor: (sesionId: string) => WorkoutLog | undefined;

  addBody: (b: BodyLog) => void;
  updateBody: (id: string, patch: Partial<BodyLog>) => void;
  deleteBody: (id: string) => void;
  lastBody: () => BodyLog | undefined;

  setNutricion: (n: NutricionLog) => void;
  getNutricion: (day?: string) => NutricionLog | undefined;

  toggleRecetaDia: (fecha: string, recipeId: string) => void;
  getComidasDia: (fecha?: string) => string[];

  addComidaLibre: (fecha: string, item: ComidaLibre) => void;
  removeComidaLibre: (fecha: string, id: string) => void;

  toggleSuplementoDia: (fecha: string, momento: string) => void;

  setPlanStart: (date: string | null) => void;

  setAgenda: (fecha: string, sesionId: string | null) => void;

  lang: "es" | "en";
  setLang: (l: "es" | "en") => void;

  reminders: Reminder[];
  updateReminder: (id: string, patch: Partial<Reminder>) => void;

  importData: (data: Partial<Pick<State, "workouts" | "bodyLogs" | "nutricion" | "comidasDia" | "comidasLibres" | "suplementosDia" | "planStart" | "agenda">>) => void;
  clearAll: () => void;
};

const empty = { workouts: [], bodyLogs: [], nutricion: {}, comidasDia: {}, comidasLibres: {}, suplementosDia: {}, planStart: null, agenda: {} };

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,
      lang: "es",
      setLang: (l) => set({ lang: l }),
      reminders: DEFAULT_REMINDERS,
      _hydrated: false,

      addWorkout: (w) =>
        set((s) => ({ workouts: [w, ...s.workouts].sort(byFechaDesc) })),
      updateWorkout: (id, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)).sort(byFechaDesc),
        })),
      deleteWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      lastWorkoutFor: (sesionId) =>
        get().workouts.find((w) => w.sesionId === sesionId),

      addBody: (b) =>
        set((s) => ({ bodyLogs: [b, ...s.bodyLogs].sort(byFechaDesc) })),
      updateBody: (id, patch) =>
        set((s) => ({
          bodyLogs: s.bodyLogs.map((b) => (b.id === id ? { ...b, ...patch } : b)).sort(byFechaDesc),
        })),
      deleteBody: (id) =>
        set((s) => ({ bodyLogs: s.bodyLogs.filter((b) => b.id !== id) })),
      lastBody: () => get().bodyLogs[0],

      setNutricion: (n) =>
        set((s) => ({ nutricion: { ...s.nutricion, [n.fecha]: n } })),
      getNutricion: (day = dayKey()) => get().nutricion[day],

      toggleRecetaDia: (fecha, recipeId) =>
        set((s) => {
          const cur = s.comidasDia[fecha] ?? [];
          const next = cur.includes(recipeId)
            ? cur.filter((id) => id !== recipeId)
            : [...cur, recipeId];
          return { comidasDia: { ...s.comidasDia, [fecha]: next } };
        }),
      getComidasDia: (fecha = dayKey()) => get().comidasDia[fecha] ?? [],

      addComidaLibre: (fecha, item) =>
        set((s) => ({
          comidasLibres: { ...s.comidasLibres, [fecha]: [...(s.comidasLibres[fecha] ?? []), item] },
        })),
      removeComidaLibre: (fecha, id) =>
        set((s) => ({
          comidasLibres: {
            ...s.comidasLibres,
            [fecha]: (s.comidasLibres[fecha] ?? []).filter((x) => x.id !== id),
          },
        })),

      toggleSuplementoDia: (fecha, momento) =>
        set((s) => {
          const cur = s.suplementosDia[fecha] ?? [];
          const next = cur.includes(momento)
            ? cur.filter((m) => m !== momento)
            : [...cur, momento];
          return { suplementosDia: { ...s.suplementosDia, [fecha]: next } };
        }),

      setPlanStart: (date) => set({ planStart: date }),

      setAgenda: (fecha, sesionId) =>
        set((s) => {
          const next = { ...s.agenda };
          if (sesionId === null) delete next[fecha];
          else next[fecha] = sesionId;
          return { agenda: next };
        }),

      updateReminder: (id, patch) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      importData: (data) =>
        set((s) => ({
          workouts: (data.workouts ?? s.workouts).slice().sort(byFechaDesc),
          bodyLogs: (data.bodyLogs ?? s.bodyLogs).slice().sort(byFechaDesc),
          nutricion: data.nutricion ?? s.nutricion,
          comidasDia: data.comidasDia ?? s.comidasDia,
          comidasLibres: data.comidasLibres ?? s.comidasLibres,
          suplementosDia: data.suplementosDia ?? s.suplementosDia,
          planStart: data.planStart !== undefined ? data.planStart : s.planStart,
          agenda: data.agenda ?? s.agenda,
        })),
      clearAll: () => set({ ...empty }),
    }),
    {
      name: "roxu-fit-v1",
      version: 2,
      // Añade a los datos ya guardados los recordatorios nuevos que no existían
      migrate: (persisted: any) => {
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

function byFechaDesc(a: { fecha: string }, b: { fecha: string }) {
  return a.fecha < b.fecha ? 1 : -1;
}
