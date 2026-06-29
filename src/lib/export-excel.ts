import type { WorkoutLog, BodyLog, NutricionLog, Plan, ComidaLibre } from "./types";
import { semanaDelPlan, pesoInicialEfectivo, ultimoPeso, BASCULAS } from "./content";

// "36P / 52C / 10G" → { p, c, g }
function parseMacros(s: string) {
  const m = s.match(/(\d+)P[^0-9]*(\d+)C[^0-9]*(\d+)G/);
  return m ? { p: +m[1], c: +m[2], g: +m[3] } : { p: 0, c: 0, g: 0 };
}

function fmt(d: string) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getFullYear()}`;
}

function setStr(s?: { kg: number | ""; reps: number | "" }) {
  if (!s) return "";
  if (s.kg === "" && s.reps === "") return "";
  const kg = s.kg === "" ? "" : s.kg;
  const reps = s.reps === "" ? "" : s.reps;
  return `${kg} x ${reps}`;
}

export type ExportOpts = {
  plan: Plan;
  planStart: string | null;
  workouts: WorkoutLog[];
  bodyLogs: BodyLog[];
  nutricion: Record<string, NutricionLog>;
  comidasDia: Record<string, string[]>;
  comidasLibres?: Record<string, ComidaLibre[]>;
  suplementosDia: Record<string, string[]>;
  recetas: any[];
};

/**
 * Genera y descarga un .xlsx con el MISMO formato que Seguimiento_Roxu.xlsx:
 * hojas Pesajes, Entrenos y Nutricion, con sus columnas exactas.
 */
export async function exportExcel(opts: ExportOpts) {
  const XLSX = await import("xlsx");
  const { plan, planStart, workouts, bodyLogs, nutricion, comidasDia, suplementosDia, recetas } = opts;
  const comidasLibres = opts.comidasLibres ?? {};
  const recById = new Map(recetas.map((r) => [r.id, r]));
  const wb = XLSX.utils.book_new();

  // ── Resumen ────────────────────────────────────────────────────────────────
  const pesoBase = pesoInicialEfectivo(plan, bodyLogs, planStart);
  const pesoUltN = ultimoPeso(bodyLogs) ?? pesoBase;
  const perdido = +(pesoBase - pesoUltN).toFixed(1);
  const nutVals = Object.values(nutricion);
  const limpios = nutVals.filter((n) => n.diaLimpio).length;
  const adher = nutVals.length ? Math.round((limpios / nutVals.length) * 100) : 0;
  const resumen = [
    ["PLAN ROXU — Seguimiento", null],
    ["Plan", plan.nombre],
    ["Inicio del plan", planStart ? fmt(planStart) : fmt(plan.fechaInicio)],
    ["Exportado", fmt(new Date().toISOString())],
    [null, null],
    ["Peso inicial (kg)", pesoBase],
    ["Peso objetivo (kg)", plan.pesoObjetivo],
    ["Último peso (kg)", pesoUltN],
    ["Kg perdidos", perdido],
    ["Semana actual", semanaDelPlan(plan, new Date(), planStart)],
    ["Sesiones registradas", workouts.length],
    ["Pesajes registrados", bodyLogs.length],
    ["Días de nutrición", nutVals.length],
    ["Adherencia nutrición (%)", adher],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");

  // ── Pesajes (manuales + báscula, en orden cronológico) ────────────────────
  const pesoHdr = [
    "Semana", "Fecha", "Peso (kg)", "Cintura (cm)", "Cadera (cm)", "Pecho (cm)",
    "Brazo (cm)", "Muslo (cm)", "% Grasa (báscula)", "Masa muscular (kg)",
    "Grasa visceral", "% Agua", "Variación peso", "Notas / sensaciones",
  ];
  type FilaPesaje = { fecha: string; peso: number | ""; cintura: any; cadera: any; pecho: any; brazo: any; muslo: any; grasa: any; musc: any; visc: any; agua: any; notas: string };
  const filas: FilaPesaje[] = [
    ...bodyLogs.map((b) => ({
      fecha: b.fecha, peso: b.peso, cintura: b.cintura, cadera: b.cadera,
      pecho: b.pecho, brazo: b.brazo, muslo: b.muslo, grasa: b.grasa,
      musc: b.masaMuscular ?? "", visc: b.visceral ?? "", agua: b.agua ?? "",
      notas: b.notas,
    })),
    ...BASCULAS.map((m) => ({
      fecha: m.fecha + "T12:00:00", peso: m.peso ?? ("" as const), cintura: "", cadera: "",
      pecho: "", brazo: "", muslo: "", grasa: m.grasaPct ?? "",
      musc: m.masaMuscular ?? "", visc: m.visceral ?? "", agua: m.agua ?? "",
      notas: "Báscula (capturas vía entrenador)",
    })),
  ].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));

  let prevPeso: number | null = null;
  const pesoRows = filas.map((b) => {
    const peso = b.peso === "" ? null : Number(b.peso);
    const vari = peso != null && prevPeso != null ? +(peso - prevPeso).toFixed(1) : "";
    if (peso != null) prevPeso = peso;
    return [
      semanaDelPlan(plan, new Date(b.fecha), planStart),
      fmt(b.fecha), b.peso, b.cintura, b.cadera, b.pecho,
      b.brazo, b.muslo, b.grasa, b.musc, b.visc, b.agua, vari, b.notas,
    ];
  });
  const wsPeso = XLSX.utils.aoa_to_sheet([pesoHdr, ...pesoRows]);
  wsPeso["!cols"] = [{ wch: 7 }, { wch: 11 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 15 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 13 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsPeso, "Pesajes");

  // ── Báscula (todas las métricas de la app de la báscula) ──────────────────
  if (BASCULAS.length) {
    const basHdr = [
      "Fecha", "Peso (kg)", "IMC", "% Grasa", "Masa grasa (kg)", "TMB (kcal)",
      "% Músculo", "Masa muscular (kg)", "% Agua", "% Proteína", "Masa ósea (kg)",
      "Grasa visceral", "Músculo esquelético (kg)", "% Grasa subcutánea",
      "Masa grasa subcutánea (kg)", "FC (ppm)",
    ];
    const basRows = BASCULAS.map((m) => [
      fmt(m.fecha + "T12:00:00"), m.peso ?? "", m.imc ?? "", m.grasaPct ?? "",
      m.masaGrasa ?? "", m.tmb ?? "", m.musculoPct ?? "", m.masaMuscular ?? "",
      m.agua ?? "", m.proteinaPct ?? "", m.osea ?? "", m.visceral ?? "",
      m.esqueletico ?? "", m.subcutaneaPct ?? "", m.masaSubcutanea ?? "", m.fc ?? "",
    ]);
    const wsBas = XLSX.utils.aoa_to_sheet([basHdr, ...basRows]);
    wsBas["!cols"] = basHdr.map(() => ({ wch: 13 }));
    XLSX.utils.book_append_sheet(wb, wsBas, "Bascula");
  }

  // ── Entrenos ──────────────────────────────────────────────────────────────
  const entHdr = [
    "Fecha", "Sesión", "Ejercicio", "Serie 1 (kg x reps)", "Serie 2 (kg x reps)",
    "Serie 3 (kg x reps)", "Serie 4 (kg x reps)", "RPE (1-10)", "Sensación lumbar (1-5)", "Notas",
  ];
  const wk = [...workouts].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const entRows: any[][] = [];
  for (const w of wk) {
    w.ejercicios.forEach((e, idx) => {
      entRows.push([
        idx === 0 ? fmt(w.fecha) : "",
        idx === 0 ? w.sesionNombre : "",
        e.nombre,
        setStr(e.sets[0]), setStr(e.sets[1]), setStr(e.sets[2]), setStr(e.sets[3]),
        idx === 0 ? (w.rpe ?? "") : "",
        idx === 0 ? (w.lumbar ?? "") : "",
        idx === 0 ? w.notas : "",
      ]);
    });
  }
  const wsEnt = XLSX.utils.aoa_to_sheet([entHdr, ...entRows]);
  wsEnt["!cols"] = [{ wch: 11 }, { wch: 12 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsEnt, "Entrenos");

  // ── Nutricion ─────────────────────────────────────────────────────────────
  const nutHdr = [
    "Fecha", "Calorías comidas", "Proteína (g)", "Comidas fuera", "Hidratación (L)",
    "Sueño (h)", "Antojos / atracones", "Día limpio (✓/✗)", "Recetas del día",
    "Suplementos tomados", "Notas",
  ];
  const dias = Array.from(
    new Set([
      ...Object.keys(nutricion), ...Object.keys(comidasDia),
      ...Object.keys(comidasLibres), ...Object.keys(suplementosDia),
    ])
  ).sort();
  const nutRows = dias.map((d) => {
    const log = nutricion[d];
    const ids = comidasDia[d] || [];
    let kcal = 0, prot = 0;
    const nombres: string[] = [];
    for (const id of ids) {
      const r = recById.get(id);
      if (r) { kcal += r.kcal; prot += parseMacros(r.macros).p; nombres.push(r.nombre); }
    }
    for (const x of comidasLibres[d] || []) {
      kcal += x.kcal;
      prot += x.p;
      nombres.push(`${x.nombre} (libre)`);
    }
    return [
      fmt(d),
      kcal || "",
      prot || "",
      log?.comioFuera ? "Sí" : "",
      log?.hidratacionOk ? 3 : "",
      log?.suenoOk ? "7-8" : "",
      log?.antojo ? "Sí" : "",
      log ? (log.diaLimpio ? "✓" : "✗") : "",
      nombres.join(" · "),
      (suplementosDia[d] || []).join(" · "),
      log?.notas || "",
    ];
  });
  const wsNut = XLSX.utils.aoa_to_sheet([nutHdr, ...nutRows]);
  wsNut["!cols"] = [{ wch: 11 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 40 }, { wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsNut, "Nutricion");

  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Seguimiento_Roxu_${fecha}.xlsx`);
}
