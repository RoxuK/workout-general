import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function todayISO() {
  return new Date().toISOString();
}

export function dayKey(d: Date = new Date()) {
  // YYYY-MM-DD en hora local
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function fmtDateLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export function nombreDia(d: Date = new Date()) {
  return DIAS[d.getDay()];
}

// Mejor set de un ejercicio (mayor kg, desempate por reps)
export function bestSet(sets: { kg: number | ""; reps: number | "" }[]) {
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    const kg = typeof s.kg === "number" ? s.kg : 0;
    const reps = typeof s.reps === "number" ? s.reps : 0;
    if (kg === 0 && reps === 0) continue;
    if (!best || kg > best.kg || (kg === best.kg && reps > best.reps)) {
      best = { kg, reps };
    }
  }
  return best;
}
