import type { Plan, WorkoutLog, BodyLog, NutritionLog } from "./types";
import { effectiveStartingWeight, latestWeight } from "./content";

export type Categoria =
  | "Entrenos"
  | "Constancia"
  | "Fuerza"
  | "Recuperación"
  | "Cuerpo"
  | "Nutrición"
  | "Especiales";

export const CATEGORIAS: Categoria[] = [
  "Entrenos",
  "Constancia",
  "Fuerza",
  "Recuperación",
  "Cuerpo",
  "Nutrición",
  "Especiales",
];

export type Achievement = {
  id: string;
  category: Categoria;
  title: string;
  desc: string;
  emoji: string;
  current: number;
  target: number;
  unlocked: boolean;
  progress: number; // 0..1
};

type Data = {
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutrition: Record<string, NutritionLog>;
};

function isoWeekKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  // the Thursday of the same week defines the ISO year
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week =
    1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function dkFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday (start of week) of a date, as a YYYY-MM-DD key
function mondayKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return dkFromDate(d);
}

// Longest streak of consecutive day keys separated by `stepDays`
function longestRun(keys: string[], stepDays: number) {
  if (!keys.length) return 0;
  const s = [...new Set(keys)].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < s.length; i++) {
    const diff = Math.round(
      (new Date(s[i] + "T00:00:00").getTime() - new Date(s[i - 1] + "T00:00:00").getTime()) / 86400000
    );
    if (diff === stepDays) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

function make(
  category: Categoria,
  id: string,
  emoji: string,
  title: string,
  desc: string,
  current: number,
  target: number,
  unlockedOverride?: boolean
): Achievement {
  const unlocked = unlockedOverride ?? current >= target;
  return {
    id,
    category,
    title,
    desc,
    emoji,
    current: Math.round(current * 10) / 10,
    target,
    unlocked,
    progress: Math.max(0, Math.min(1, target > 0 ? current / target : unlocked ? 1 : 0)),
  };
}

export function computeAchievements(data: Data, plan: Plan, planStart?: string | null): Achievement[] {
  const { workouts, bodyLogs, nutrition } = data;
  const nWorkouts = workouts.length;

  // --- Workouts per week ---
  const perWeek = new Map<string, number>();
  for (const w of workouts) {
    const k = isoWeekKey(w.date);
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  const maxWeek = perWeek.size ? Math.max(...perWeek.values()) : 0;
  const fullWeeks = Array.from(perWeek.values()).filter((v) => v >= 4).length;
  const distinctWeeks = perWeek.size;

  // Streaks (consecutive weeks training, consecutive clean days)
  const weekStreak = longestRun(workouts.map((w) => mondayKey(w.date)), 7);

  // --- Volume / strength ---
  let setsWithWeight = 0;
  let tonnage = 0;
  let totalReps = 0;
  for (const w of workouts)
    for (const e of w.exercises)
      for (const s of e.sets) {
        const kg = typeof s.kg === "number" ? s.kg : 0;
        const reps = typeof s.reps === "number" ? s.reps : 0;
        if (reps > 0) totalReps += reps;
        if (kg > 0 && reps > 0) {
          setsWithWeight++;
          tonnage += kg * reps;
        }
      }

  // --- Intensity and recovery ---
  const rpe9 = workouts.filter((w) => (w.rpe ?? 0) >= 9).length;
  const rpe8 = workouts.filter((w) => (w.rpe ?? 0) >= 8).length;
  const soreness4 = workouts.filter((w) => (w.soreness ?? 0) >= 4).length;
  const soreness5 = workouts.filter((w) => (w.soreness ?? 0) >= 5).length;

  // --- Weight and composition (base = first real weigh-in, not the plan's number) ---
  const baseWeight = effectiveStartingWeight(plan, bodyLogs, planStart);
  const currentWeight = latestWeight(bodyLogs) ?? baseWeight;
  const lost = Math.max(0, baseWeight - currentWeight);
  const targetKg = Math.max(1, baseWeight - plan.targetWeight);

  const first = <K extends keyof BodyLog>(key: K) => [...bodyLogs].reverse().find((b) => b[key] !== "");
  const latest = <K extends keyof BodyLog>(key: K) => bodyLogs.find((b) => b[key] !== "");
  const waistStart = first("waist");
  const waistLatest = latest("waist");
  const waistDown =
    waistStart && waistLatest ? Math.max(0, Number(waistStart.waist) - Number(waistLatest.waist)) : 0;
  const fatStart = first("bodyFat");
  const fatLatest = latest("bodyFat");
  const fatDown = fatStart && fatLatest ? Math.max(0, Number(fatStart.bodyFat) - Number(fatLatest.bodyFat)) : 0;

  // --- Nutrition ---
  const nut = Object.values(nutrition);
  const cleanDays = nut.filter((n) => n.cleanDay).length;
  const hydration = nut.filter((n) => n.hydrationGoalMet).length;
  const protein = nut.filter((n) => n.proteinGoalMet).length;
  const sleep = nut.filter((n) => n.sleepGoalMet).length;
  const cleanStreak = longestRun(nut.filter((n) => n.cleanDay).map((n) => n.date), 1);

  // --- Specials ---
  // Only sessions from the split (travel sessions are optional, don't count toward "All-rounder")
  const baseSessions = plan.sessions.filter((s) => !s.travel);
  const baseIds = new Set(baseSessions.map((s) => s.id));
  const distinctSessions = new Set(workouts.map((w) => w.sessionId).filter((id) => baseIds.has(id))).size;
  const totalSessions = baseSessions.length || 4;
  const weekend = workouts.filter((w) => {
    const d = new Date(w.date).getDay();
    return d === 0 || d === 6;
  }).length;
  const earlyBird = workouts.filter((w) => {
    const h = new Date(w.date).getHours();
    return h > 0 && h < 9;
  }).length;

  return [
    // ====== Entrenos (volumen) ======
    make("Entrenos", "primer-entreno", "🏁", "Primer paso", "Registra tu primer entreno", nWorkouts, 1),
    make("Entrenos", "constancia-10", "💪", "Constancia", "10 entrenos completados", nWorkouts, 10),
    make("Entrenos", "veterano-25", "🎖️", "Veterano", "25 entrenos completados", nWorkouts, 25),
    make("Entrenos", "medio-centenar", "🏅", "Medio centenar", "50 entrenos completados", nWorkouts, 50),
    make("Entrenos", "centenario", "💯", "Centenario", "100 entrenos completados", nWorkouts, 100),

    // ====== Constancia (semanas y rachas) ======
    make("Constancia", "semana-completa", "🔥", "Semana redonda", "4 entrenos en una misma semana", maxWeek, 4),
    make("Constancia", "doble-semana", "📆", "Doblete", "2 semanas con 4 entrenos", fullWeeks, 2),
    make("Constancia", "mes-perfecto", "🗓️", "Mes perfecto", "4 semanas con 4 entrenos", fullWeeks, 4),
    make("Constancia", "racha-3", "⚡", "En racha", "3 semanas seguidas entrenando", weekStreak, 3),
    make("Constancia", "racha-6", "🌟", "Imparable", "6 semanas seguidas entrenando", weekStreak, 6),
    make("Constancia", "bloque-8", "🧗", "Bloque a fondo", "Entrena en 8 semanas distintas", distinctWeeks, 8),
    make("Constancia", "bloque-12", "🏔️", "Bloque completo", "Entrena en 12 semanas distintas", distinctWeeks, 12),

    // ====== Fuerza (volumen, tonelaje, intensidad) ======
    make("Fuerza", "fuerza-50", "🏋️", "A tope", "50 series con carga registradas", setsWithWeight, 50),
    make("Fuerza", "series-150", "🦾", "Máquina", "150 series con carga", setsWithWeight, 150),
    make("Fuerza", "series-300", "⚙️", "Forjada en hierro", "300 series con carga", setsWithWeight, 300),
    make("Fuerza", "reps-2500", "🔢", "Repeticiones sin fin", "2.500 repeticiones totales", totalReps, 2500),
    make("Fuerza", "tonelaje-10k", "🛞", "Levanta toneladas", "10.000 kg movidos en total", tonnage, 10000),
    make("Fuerza", "tonelaje-50k", "🚚", "Fuerza de carga", "50.000 kg movidos en total", tonnage, 50000),
    make("Fuerza", "tonelaje-150k", "⛰️", "Mueve montañas", "150.000 kg movidos en total", tonnage, 150000),
    make("Fuerza", "rpe-alto", "😤", "Sin excusas", "Una sesión a RPE 9 o más", rpe9, 1),
    make("Fuerza", "esfuerzo-10", "🥵", "Esfuerzo real", "10 sesiones a RPE 8+", rpe8, 10),

    // ====== Recuperación ======
    make("Recuperación", "cuerpo-fuerte", "🧱", "Cuerpo a tope", "5 sesiones con sensación 4+/5", soreness4, 5),
    make("Recuperación", "recuperacion-perfecta", "🛡️", "Recuperación perfecta", "3 sesiones con sensación 5/5", soreness5, 3),
    make("Recuperación", "sin-molestias-15", "🧘", "Sin molestias", "15 sesiones con sensación 4+/5", soreness4, 15),

    // ====== Cuerpo (peso y medidas) ======
    make("Cuerpo", "primer-pesaje", "📏", "Toma de contacto", "Registra tu primer pesaje", bodyLogs.length, 1),
    make("Cuerpo", "seguimiento-8", "📊", "Seguimiento fiel", "8 pesajes registrados", bodyLogs.length, 8),
    make("Cuerpo", "primer-kilo", "⚖️", "Primer kilo", "Pierde tu primer kilo", lost, 1),
    make("Cuerpo", "mitad-camino", "🚀", "A mitad de camino", `Pierde ${(targetKg / 2).toFixed(0)} kg`, lost, targetKg / 2),
    make("Cuerpo", "meta-peso", "🏆", `Meta ${plan.targetWeight} kg`, "Alcanza tu peso objetivo", lost, targetKg, currentWeight <= plan.targetWeight),
    make("Cuerpo", "cintura-menos", "📐", "Menos cintura", "Reduce 3 cm de cintura", waistDown, 3),
    make("Cuerpo", "grasa-abajo", "🔥", "Quema grasa", "Baja un 2% de grasa corporal", fatDown, 2),

    // ====== Nutrición ======
    make("Nutrición", "disciplina", "🥗", "Disciplina", "14 días limpios de nutrición", cleanDays, 14),
    make("Nutrición", "mes-limpio", "🏵️", "Mes impecable", "30 días limpios de nutrición", cleanDays, 30),
    make("Nutrición", "racha-limpia-7", "🌱", "Semana limpia", "7 días limpios seguidos", cleanStreak, 7),
    make("Nutrición", "hidratado", "💧", "Bien hidratado", "14 días cumpliendo el agua", hydration, 14),
    make("Nutrición", "proteina-pro", "🍗", "Proteína al día", "14 días llegando a la proteína", protein, 14),
    make("Nutrición", "buen-descanso", "😴", "Buen descanso", "14 días durmiendo bien", sleep, 14),

    // ====== Especiales ======
    make("Especiales", "todoterreno", "🧩", "Todoterreno", "Entrena cada una de tus sesiones", distinctSessions, totalSessions),
    make("Especiales", "finde-activo", "🌅", "Fin de semana activo", "Entrena un sábado o domingo", weekend, 1),
    make("Especiales", "al-amanecer", "🌄", "Al amanecer", "Entrena antes de las 9:00", earlyBird, 1),
  ];
}
