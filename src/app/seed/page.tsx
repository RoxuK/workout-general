"use client";

// Página SOLO de desarrollo: carga datos de prueba realistas para revisar
// la app en localhost. En producción no hace nada.

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Trash2, Check, Home } from "lucide-react";
import { getPlanActivo } from "@/lib/content";
import { useStore } from "@/lib/store";
import type { BodyLog, NutricionLog, WorkoutLog } from "@/lib/types";
import { dayKey, uid } from "@/lib/utils";

const BASE_KG: Record<string, number> = {
  "Press banca con mancuernas": 14,
  "Remo con mancuerna a 1 brazo": 16,
  "Press militar sentado con mancuernas": 10,
  "Jalón al pecho (polea)": 40,
  "Curl bíceps con mancuernas alterno": 8,
  "Extensión tríceps en polea (cuerda)": 15,
  "Sentadilla goblet con mancuerna": 16,
  "Prensa de piernas": 80,
  "Zancadas caminando con mancuernas": 10,
  "Extensión de cuádriceps (máquina)": 30,
  "Curl femoral tumbado (máquina)": 25,
  "Elevación de gemelos de pie": 40,
  "Dead bug con peso ligero": 4,
  "Dominadas asistidas (máquina o banda)": 30,
  "Press inclinado con mancuernas": 12,
  "Remo en máquina (pecho apoyado)": 35,
  "Aperturas en máquina (peck deck)": 30,
  "Face pull en polea": 15,
  "Curl martillo con mancuernas": 8,
  "Hip thrust con barra (apoyo bajo)": 40,
  "Peso muerto rumano con mancuernas": 16,
  "Sentadilla búlgara con mancuernas": 8,
  "Curl femoral sentado (máquina)": 30,
  "Abducción de cadera (máquina o banda)": 35,
  "Elevación de gemelos sentado": 25,
  "Bird-dog con mancuerna ligera": 2,
};

const MOMENTOS = ["Mañana (desayuno)", "Pre-entreno", "Post-entreno", "Noche"];

function diasAtras(n: number, hora = 12, min = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, min, 0, 0);
  return d;
}

function buildDemo() {
  const plan = getPlanActivo();
  const sesionPorDia: Record<number, string> = {
    1: "upper-a", // lunes
    2: "lower-a",
    4: "upper-b",
    5: "lower-b",
  };

  // ── Entrenos: 3 semanas hacia atrás con progresión de +2,5 kg/semana ──────
  const workouts: WorkoutLog[] = [];
  for (let atras = 21; atras >= 1; atras--) {
    const fecha = diasAtras(atras, 18, 30);
    const dow = fecha.getDay();
    let sesionId = sesionPorDia[dow];
    // Un entreno de viaje el sábado de la semana pasada
    if (dow === 6 && atras <= 9) sesionId = "viaje-a";
    if (!sesionId) continue;

    const sesion = plan.sesiones.find((s) => s.id === sesionId);
    if (!sesion) continue;

    const semana = Math.floor((21 - atras) / 7); // 0, 1, 2
    const w: WorkoutLog = {
      id: uid(),
      fecha: fecha.toISOString(),
      sesionId: sesion.id,
      sesionNombre: sesion.nombre,
      ejercicios: sesion.ejercicios.map((ej) => {
        const base = BASE_KG[ej.nombre] ?? 0;
        const inc = base >= 60 ? 5 : 2.5; // la prensa progresa de 5 en 5
        const kg = base > 0 ? base + semana * inc : 0;
        const reps = parseInt(ej.reps, 10) || 10;
        return {
          nombre: ej.nombre,
          sets: Array.from({ length: ej.series }, (_, i) => ({
            kg: kg > 0 ? kg : ("" as const),
            // última serie de la última semana con una rep extra (PRs variados)
            reps: semana === 2 && i === ej.series - 1 ? reps + 1 : reps,
          })),
        };
      }),
      rpe: semana === 0 ? 7 : 8,
      lumbar: atras === 16 ? 3 : atras % 3 === 0 ? 5 : 4,
      notas: atras === 16 ? "Algo cargada la lumbar tras el shibari del finde" : "",
    };
    workouts.push(w);
  }

  // ── Pesajes: cada 3 días, 86,0 → 84,5 kg ──────────────────────────────────
  const pesos = [86.0, 85.7, 85.5, 85.3, 85.0, 84.9, 84.7, 84.5];
  const bodyLogs: BodyLog[] = pesos.map((peso, i) => {
    const fecha = diasAtras(21 - i * 3, 8, 0);
    const completo = i === 0 || i === pesos.length - 1;
    return {
      id: uid(),
      fecha: fecha.toISOString(),
      peso,
      cintura: completo || i % 2 === 0 ? +(99 - i * 0.3).toFixed(1) : "",
      cadera: completo ? 104 : "",
      pecho: completo ? (i === 0 ? 106 : 105.5) : "",
      brazo: completo ? 33 : "",
      muslo: completo ? 60 : "",
      grasa: completo ? +(28 - i * 0.1).toFixed(1) : "",
      notas: i === 0 ? "Arranque del bloque" : "",
    };
  });

  // ── Nutrición: últimos 14 días ────────────────────────────────────────────
  const nutricion: Record<string, NutricionLog> = {};
  for (let atras = 13; atras >= 0; atras--) {
    const k = dayKey(diasAtras(atras));
    const comioFuera = atras === 10 || atras === 3;
    nutricion[k] = {
      fecha: k,
      proteinaOk: atras !== 10,
      comioFuera,
      hidratacionOk: atras % 3 !== 2,
      suenoOk: atras % 4 !== 3,
      antojo: atras === 7,
      diaLimpio: !comioFuera && atras !== 7,
      notas: atras === 3 ? "Cena con amigas en el vietnamita, elegí bien" : "",
    };
  }

  // ── Diario de comidas: últimos 3 días ─────────────────────────────────────
  const comidasDia: Record<string, string[]> = {
    [dayKey(diasAtras(2))]: ["des-1", "com-1", "post-1", "cen-1"],
    [dayKey(diasAtras(1))]: ["des-2", "pre-1", "com-2", "cen-2"],
    [dayKey(diasAtras(0))]: ["des-3", "com-3"],
  };

  // ── Suplementación: últimos 6 días ────────────────────────────────────────
  const suplementosDia: Record<string, string[]> = {};
  for (let atras = 5; atras >= 1; atras--) {
    const k = dayKey(diasAtras(atras));
    const entreno = workouts.some((w) => dayKey(new Date(w.fecha)) === k);
    suplementosDia[k] = entreno
      ? [...MOMENTOS]
      : ["Mañana (desayuno)", "Noche"];
  }
  suplementosDia[dayKey()] = ["Mañana (desayuno)"];

  // ── Agenda: hoy toca lo que diga el split ─────────────────────────────────
  const hoyDow = new Date().getDay();
  const agenda: Record<string, string> = {
    [dayKey()]: sesionPorDia[hoyDow] ?? "upper-a",
  };

  return {
    workouts,
    bodyLogs,
    nutricion,
    comidasDia,
    suplementosDia,
    planStart: dayKey(diasAtras(21)),
    agenda,
  };
}

export default function Seed() {
  const importData = useStore((s) => s.importData);
  const clearAll = useStore((s) => s.clearAll);
  const [done, setDone] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return (
      <div className="pt-10 text-center">
        <p className="text-muted">Esta página solo existe en desarrollo.</p>
        <Link href="/" className="btn-ghost mt-4 inline-flex">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up pt-6">
      <h1 className="font-display text-3xl">Datos de prueba</h1>
      <p className="mt-1 text-sm text-muted">
        Carga 3 semanas de registros de ejemplo (entrenos con progresión, pesajes,
        nutrición, comidas y suplementación) para revisar la app con contenido real.
      </p>

      <button
        onClick={() => {
          importData(buildDemo());
          setDone(true);
        }}
        className="btn-accent mt-6 w-full gap-2"
      >
        {done ? <Check size={18} /> : <FlaskConical size={18} />}
        {done ? "Datos cargados ✓" : "Cargar datos de prueba"}
      </button>

      <button
        onClick={() => {
          if (confirm("¿Borrar TODOS los registros locales?")) {
            clearAll();
            setDone(false);
          }
        }}
        className="btn mt-3 w-full justify-center gap-2 border border-bad/40 bg-bad/10 text-bad"
      >
        <Trash2 size={16} /> Vaciar todos los datos
      </button>

      {done && (
        <Link href="/" className="btn-ghost mt-3 w-full gap-2">
          <Home size={16} /> Ir al inicio y revisar
        </Link>
      )}

      <p className="mt-6 text-center text-[11px] text-muted">
        Sobrescribe lo que hubiera. Usa &quot;Vaciar&quot; antes de usar la app de verdad.
      </p>
    </div>
  );
}
