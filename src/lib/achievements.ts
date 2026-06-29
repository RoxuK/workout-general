import type { Plan, WorkoutLog, BodyLog, NutricionLog } from "./types";
import { pesoInicialEfectivo, ultimoPeso } from "./content";

export type Categoria =
  | "Entrenos"
  | "Constancia"
  | "Fuerza"
  | "Salud lumbar"
  | "Cuerpo"
  | "Nutrición"
  | "Especiales";

export const CATEGORIAS: Categoria[] = [
  "Entrenos",
  "Constancia",
  "Fuerza",
  "Salud lumbar",
  "Cuerpo",
  "Nutrición",
  "Especiales",
];

export type Achievement = {
  id: string;
  categoria: Categoria;
  titulo: string;
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
  nutricion: Record<string, NutricionLog>;
};

function isoWeekKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  // jueves de la misma semana define el año ISO
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

// Lunes (inicio de semana) de una fecha, como clave YYYY-MM-DD
function mondayKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return dkFromDate(d);
}

// Racha más larga de claves de día consecutivas separadas por `stepDays`
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
  categoria: Categoria,
  id: string,
  emoji: string,
  titulo: string,
  desc: string,
  current: number,
  target: number,
  unlockedOverride?: boolean
): Achievement {
  const unlocked = unlockedOverride ?? current >= target;
  return {
    id,
    categoria,
    titulo,
    desc,
    emoji,
    current: Math.round(current * 10) / 10,
    target,
    unlocked,
    progress: Math.max(0, Math.min(1, target > 0 ? current / target : unlocked ? 1 : 0)),
  };
}

export function computeAchievements(data: Data, plan: Plan, planStart?: string | null): Achievement[] {
  const { workouts, bodyLogs, nutricion } = data;
  const nWorkouts = workouts.length;

  // --- Entrenos por semana ---
  const perWeek = new Map<string, number>();
  for (const w of workouts) {
    const k = isoWeekKey(w.fecha);
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  const maxWeek = perWeek.size ? Math.max(...perWeek.values()) : 0;
  const semanasCompletas = Array.from(perWeek.values()).filter((v) => v >= 4).length;
  const semanasDistintas = perWeek.size;

  // Rachas (semanas consecutivas entrenando, días limpios consecutivos)
  const rachaSemanas = longestRun(workouts.map((w) => mondayKey(w.fecha)), 7);

  // --- Volumen / fuerza ---
  let seriesConPeso = 0;
  let tonelaje = 0;
  let totalReps = 0;
  for (const w of workouts)
    for (const e of w.ejercicios)
      for (const s of e.sets) {
        const kg = typeof s.kg === "number" ? s.kg : 0;
        const reps = typeof s.reps === "number" ? s.reps : 0;
        if (reps > 0) totalReps += reps;
        if (kg > 0 && reps > 0) {
          seriesConPeso++;
          tonelaje += kg * reps;
        }
      }

  // --- Intensidad y lumbar ---
  const rpe9 = workouts.filter((w) => (w.rpe ?? 0) >= 9).length;
  const rpe8 = workouts.filter((w) => (w.rpe ?? 0) >= 8).length;
  const lumbar4 = workouts.filter((w) => (w.lumbar ?? 0) >= 4).length;
  const lumbar5 = workouts.filter((w) => (w.lumbar ?? 0) >= 5).length;

  // --- Peso y composición (base = primer pesaje real, no el número del plan) ---
  const pesoBase = pesoInicialEfectivo(plan, bodyLogs, planStart);
  const pesoActual = ultimoPeso(bodyLogs) ?? pesoBase;
  const perdido = Math.max(0, pesoBase - pesoActual);
  const objetivoKg = Math.max(1, pesoBase - plan.pesoObjetivo);

  const primero = <K extends keyof BodyLog>(key: K) => [...bodyLogs].reverse().find((b) => b[key] !== "");
  const ultimo = <K extends keyof BodyLog>(key: K) => bodyLogs.find((b) => b[key] !== "");
  const cinturaIni = primero("cintura");
  const cinturaUlt = ultimo("cintura");
  const cinturaBaja =
    cinturaIni && cinturaUlt ? Math.max(0, Number(cinturaIni.cintura) - Number(cinturaUlt.cintura)) : 0;
  const grasaIni = primero("grasa");
  const grasaUlt = ultimo("grasa");
  const grasaBaja = grasaIni && grasaUlt ? Math.max(0, Number(grasaIni.grasa) - Number(grasaUlt.grasa)) : 0;

  // --- Nutrición ---
  const nut = Object.values(nutricion);
  const diasLimpios = nut.filter((n) => n.diaLimpio).length;
  const hidratacion = nut.filter((n) => n.hidratacionOk).length;
  const proteina = nut.filter((n) => n.proteinaOk).length;
  const sueno = nut.filter((n) => n.suenoOk).length;
  const rachaLimpia = longestRun(nut.filter((n) => n.diaLimpio).map((n) => n.fecha), 1);

  // --- Especiales ---
  // Solo las sesiones del split (las de viaje son opcionales, no cuentan para "Todoterreno")
  const sesionesBase = plan.sesiones.filter((s) => !s.viaje);
  const baseIds = new Set(sesionesBase.map((s) => s.id));
  const distintas = new Set(workouts.map((w) => w.sesionId).filter((id) => baseIds.has(id))).size;
  const totalSesiones = sesionesBase.length || 4;
  const finde = workouts.filter((w) => {
    const d = new Date(w.fecha).getDay();
    return d === 0 || d === 6;
  }).length;
  const madrugador = workouts.filter((w) => {
    const h = new Date(w.fecha).getHours();
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
    make("Constancia", "doble-semana", "📆", "Doblete", "2 semanas con 4 entrenos", semanasCompletas, 2),
    make("Constancia", "mes-perfecto", "🗓️", "Mes perfecto", "4 semanas con 4 entrenos", semanasCompletas, 4),
    make("Constancia", "racha-3", "⚡", "En racha", "3 semanas seguidas entrenando", rachaSemanas, 3),
    make("Constancia", "racha-6", "🌟", "Imparable", "6 semanas seguidas entrenando", rachaSemanas, 6),
    make("Constancia", "bloque-8", "🧗", "Bloque a fondo", "Entrena en 8 semanas distintas", semanasDistintas, 8),
    make("Constancia", "bloque-12", "🏔️", "Bloque completo", "Entrena en 12 semanas distintas", semanasDistintas, 12),

    // ====== Fuerza (volumen, tonelaje, intensidad) ======
    make("Fuerza", "fuerza-50", "🏋️", "A tope", "50 series con carga registradas", seriesConPeso, 50),
    make("Fuerza", "series-150", "🦾", "Máquina", "150 series con carga", seriesConPeso, 150),
    make("Fuerza", "series-300", "⚙️", "Forjada en hierro", "300 series con carga", seriesConPeso, 300),
    make("Fuerza", "reps-2500", "🔢", "Repeticiones sin fin", "2.500 repeticiones totales", totalReps, 2500),
    make("Fuerza", "tonelaje-10k", "🛞", "Levanta toneladas", "10.000 kg movidos en total", tonelaje, 10000),
    make("Fuerza", "tonelaje-50k", "🚚", "Fuerza de carga", "50.000 kg movidos en total", tonelaje, 50000),
    make("Fuerza", "tonelaje-150k", "⛰️", "Mueve montañas", "150.000 kg movidos en total", tonelaje, 150000),
    make("Fuerza", "rpe-alto", "😤", "Sin excusas", "Una sesión a RPE 9 o más", rpe9, 1),
    make("Fuerza", "esfuerzo-10", "🥵", "Esfuerzo real", "10 sesiones a RPE 8+", rpe8, 10),

    // ====== Salud lumbar ======
    make("Salud lumbar", "lumbar-acero", "🧱", "Espalda de acero", "5 sesiones con lumbar 4+/5", lumbar4, 5),
    make("Salud lumbar", "lumbar-perfecto", "🛡️", "Núcleo blindado", "3 sesiones con lumbar 5/5", lumbar5, 3),
    make("Salud lumbar", "sin-dolor-15", "🧘", "Sin molestias", "15 sesiones con lumbar 4+/5", lumbar4, 15),

    // ====== Cuerpo (peso y medidas) ======
    make("Cuerpo", "primer-pesaje", "📏", "Toma de contacto", "Registra tu primer pesaje", bodyLogs.length, 1),
    make("Cuerpo", "seguimiento-8", "📊", "Seguimiento fiel", "8 pesajes registrados", bodyLogs.length, 8),
    make("Cuerpo", "primer-kilo", "⚖️", "Primer kilo", "Pierde tu primer kilo", perdido, 1),
    make("Cuerpo", "mitad-camino", "🚀", "A mitad de camino", `Pierde ${(objetivoKg / 2).toFixed(0)} kg`, perdido, objetivoKg / 2),
    make("Cuerpo", "meta-peso", "🏆", `Meta ${plan.pesoObjetivo} kg`, "Alcanza tu peso objetivo", perdido, objetivoKg, pesoActual <= plan.pesoObjetivo),
    make("Cuerpo", "cintura-menos", "📐", "Menos cintura", "Reduce 3 cm de cintura", cinturaBaja, 3),
    make("Cuerpo", "grasa-abajo", "🔥", "Quema grasa", "Baja un 2% de grasa corporal", grasaBaja, 2),

    // ====== Nutrición ======
    make("Nutrición", "disciplina", "🥗", "Disciplina", "14 días limpios de nutrición", diasLimpios, 14),
    make("Nutrición", "mes-limpio", "🏵️", "Mes impecable", "30 días limpios de nutrición", diasLimpios, 30),
    make("Nutrición", "racha-limpia-7", "🌱", "Semana limpia", "7 días limpios seguidos", rachaLimpia, 7),
    make("Nutrición", "hidratado", "💧", "Hidratada", "14 días cumpliendo el agua", hidratacion, 14),
    make("Nutrición", "proteina-pro", "🍗", "Proteína al día", "14 días llegando a la proteína", proteina, 14),
    make("Nutrición", "buen-descanso", "😴", "Buen descanso", "14 días durmiendo bien", sueno, 14),

    // ====== Especiales ======
    make("Especiales", "todoterreno", "🧩", "Todoterreno", "Entrena cada una de tus sesiones", distintas, totalSesiones),
    make("Especiales", "guerrera-finde", "🌅", "Guerrera de finde", "Entrena un sábado o domingo", finde, 1),
    make("Especiales", "madrugadora", "🌄", "Madrugadora", "Entrena antes de las 9:00", madrugador, 1),
  ];
}
