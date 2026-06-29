import type { Plan, BodyLog, Bascula } from "./types";
import planBloque1 from "../../content/plans/2026-04-27-bloque-1.json";
import basculas from "../../content/body/basculas.json";
import targets from "../../content/nutrition/targets.json";
import shopping from "../../content/nutrition/shopping.json";
import recetas from "../../content/nutrition/recetas.json";
import comidasLibres from "../../content/nutrition/comidas-libres.json";
import suplementacion from "../../content/nutrition/suplementacion.json";
import comerFuera from "../../content/knowledge/comer-fuera-berlin.json";
import lumbar from "../../content/knowledge/recuperacion-lumbar.json";
import imagenes from "../../content/knowledge/ejercicios-imagenes.json";

// Todos los bloques de entrenamiento generados por el entrenador.
// Para añadir un bloque nuevo: crea el JSON en /content/plans y añádelo aquí.
export const PLANES: Plan[] = [planBloque1 as Plan];

// El plan activo se decide por fecha (el bloque cuyo rango contiene "hoy"),
// y si ninguno coincide, el último de la lista.
export function getPlanActivo(hoy = new Date()): Plan {
  const t = hoy.getTime();
  const activo = PLANES.find((p) => {
    const ini = new Date(p.fechaInicio).getTime();
    const fin = new Date(p.fechaFin).getTime();
    return t >= ini && t <= fin;
  });
  return activo ?? PLANES[PLANES.length - 1];
}

export const NUTRICION = targets;
export const SHOPPING = shopping;
export const RECETAS = recetas;
export const COMIDAS_LIBRES = comidasLibres;
export const SUPLEMENTACION = suplementacion;
export const COMER_FUERA = comerFuera;
export const LUMBAR = lumbar;

// Mediciones de la báscula inteligente: Roxu manda las capturas por el chat
// y el entrenador las vuelca aquí (content/body/basculas.json).
export const BASCULAS: Bascula[] = (basculas.mediciones as Bascula[]) ?? [];

// Mapa nombre de ejercicio -> imágenes de referencia (free-exercise-db, licencia abierta)
export const IMAGENES: Record<string, { fuente: string | null; imagenes: string[] }> =
  imagenes as any;

export function imagenesDe(nombre: string) {
  return IMAGENES[nombre]?.imagenes ?? [];
}

// Fecha de inicio efectiva: la que elija Roxu en la app tiene prioridad
// sobre la fecha fija del JSON. Así el plan es adaptable.
export function inicioEfectivo(plan: Plan, override?: string | null) {
  return override || plan.fechaInicio;
}

// Semana del plan (1-based) según la fecha de inicio (con posible override).
export function semanaDelPlan(plan: Plan, hoy = new Date(), override?: string | null) {
  const ini = new Date(inicioEfectivo(plan, override)).getTime();
  const dias = Math.floor((hoy.getTime() - ini) / 86400000);
  return Math.max(1, Math.floor(dias / 7) + 1);
}

// Número total de semanas que dura el plan (a partir de sus fases).
export function totalSemanas(plan: Plan) {
  let max = 0;
  for (const f of plan.fases) {
    const parts = f.semanas.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
    max = Math.max(max, parts[parts.length - 1] || 0);
  }
  return max || 12;
}

// Nombre de la fase activa según la semana (mapea "1–2", "3–6"...).
export function faseActual(plan: Plan, hoy = new Date(), override?: string | null) {
  const semana = semanaDelPlan(plan, hoy, override);
  for (const f of plan.fases) {
    const [a, b] = f.semanas.split(/[–-]/).map((s) => parseInt(s.trim(), 10));
    if (semana >= a && semana <= (b || a)) return f.nombre;
  }
  return plan.fases[plan.fases.length - 1]?.nombre;
}

// ¿Ya ha empezado el plan? (si la fecha efectiva es hoy o anterior)
export function planEmpezado(plan: Plan, override?: string | null, hoy = new Date()) {
  const ini = new Date(inicioEfectivo(plan, override));
  ini.setHours(0, 0, 0, 0);
  const h = new Date(hoy);
  h.setHours(0, 0, 0, 0);
  return h.getTime() >= ini.getTime();
}

// Peso de partida REAL: el primer pesaje (báscula o manual) desde que empieza
// el plan. Si aún no hay ninguno, el último conocido antes de empezar; y si
// no hay nada de nada, el estimado del JSON del plan.
export function pesoInicialEfectivo(plan: Plan, bodyLogs: BodyLog[], override?: string | null) {
  const ini = new Date(inicioEfectivo(plan, override));
  ini.setHours(0, 0, 0, 0);
  const pesos = [
    ...BASCULAS.filter((m) => m.peso != null).map((m) => ({
      t: new Date(m.fecha + "T12:00:00").getTime(),
      peso: m.peso as number,
    })),
    ...bodyLogs
      .filter((b) => b.peso !== "")
      .map((b) => ({ t: new Date(b.fecha).getTime(), peso: Number(b.peso) })),
  ].sort((a, b) => a.t - b.t);
  if (!pesos.length) return plan.pesoInicial;
  const desde = pesos.find((p) => p.t >= ini.getTime());
  return (desde ?? pesos[pesos.length - 1]).peso;
}

// Último peso conocido entre báscula y pesajes manuales (o null si no hay).
export function ultimoPeso(bodyLogs: BodyLog[]): number | null {
  const pesos = [
    ...BASCULAS.filter((m) => m.peso != null).map((m) => ({
      t: new Date(m.fecha + "T12:00:00").getTime(),
      peso: m.peso as number,
    })),
    ...bodyLogs
      .filter((b) => b.peso !== "")
      .map((b) => ({ t: new Date(b.fecha).getTime(), peso: Number(b.peso) })),
  ].sort((a, b) => b.t - a.t);
  return pesos[0]?.peso ?? null;
}
