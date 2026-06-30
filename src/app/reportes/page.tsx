"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, Check, FileSpreadsheet } from "lucide-react";
import Header from "@/components/Header";
import { RECETAS, SUPLEMENTACION, pesoInicialEfectivo, ultimoPeso } from "@/lib/content";
import { useActivePlan } from "@/lib/user-content";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { bestSet, fmtDate } from "@/lib/utils";
import { exportExcel } from "@/lib/export-excel";

function parseMacrosRep(s: string) {
  const m = s.match(/(\d+)P[^0-9]*(\d+)C[^0-9]*(\d+)G/);
  return m ? { p: +m[1], c: +m[2], g: +m[3] } : { p: 0, c: 0, g: 0 };
}

export default function Reportes() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [weeks, setWeeks] = useState(2);
  const [copied, setCopied] = useState(false);
  const t = useT();

  const plan = useActivePlan();
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutricion = useStore((s) => s.nutricion);
  const comidasDia = useStore((s) => s.comidasDia);
  const comidasLibres = useStore((s) => s.comidasLibres);
  const suplementosDia = useStore((s) => s.suplementosDia);
  const planStart = useStore((s) => s.planStart);

  const md = useMemo(() => {
    if (!mounted) return "";
    const desde = new Date();
    desde.setDate(desde.getDate() - weeks * 7);
    const allRecipes: any[] = RECETAS.recetas as any[];

    const wk = workouts.filter((w) => new Date(w.fecha) >= desde);
    const bl = bodyLogs.filter((b) => new Date(b.fecha) >= desde);
    const nut = Object.values(nutricion).filter((n) => new Date(n.fecha) >= desde);

    const pesoBase = pesoInicialEfectivo(plan, bodyLogs, planStart);
    const pesoUltimo = ultimoPeso(bodyLogs);
    const perdidoTotal = pesoUltimo != null ? pesoBase - pesoUltimo : 0;

    const diasLimpios = nut.filter((n) => n.diaLimpio).length;
    const adherencia = nut.length ? Math.round((diasLimpios / nut.length) * 100) : 0;
    const lumbarVals = wk.filter((w) => w.lumbar != null).map((w) => w.lumbar as number);
    const lumbarMedia = lumbarVals.length
      ? (lumbarVals.reduce((a, b) => a + b, 0) / lumbarVals.length).toFixed(1)
      : "—";
    const rpeVals = wk.filter((w) => w.rpe != null).map((w) => w.rpe as number);
    const rpeMedia = rpeVals.length
      ? (rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length).toFixed(1)
      : "—";

    // Mejores sets por ejercicio en el periodo
    const prMap = new Map<string, { kg: number; reps: number }>();
    for (const w of wk) {
      for (const e of w.ejercicios) {
        const b = bestSet(e.sets);
        if (!b) continue;
        const cur = prMap.get(e.nombre);
        if (!cur || b.kg > cur.kg) prMap.set(e.nombre, b);
      }
    }

    const L: string[] = [];
    L.push(`# Reporte de seguimiento — Roxu`);
    L.push(`**Periodo:** últimas ${weeks} semanas · generado ${fmtDate(new Date().toISOString())}`);
    L.push(`**Plan:** ${plan.nombre}`);
    L.push(``);
    L.push(`## Peso y composición`);
    L.push(`- Peso inicial del bloque: **${pesoBase} kg** · objetivo **${plan.pesoObjetivo} kg**`);
    L.push(`- Último peso: **${pesoUltimo != null ? pesoUltimo + " kg" : "sin registrar"}**`);
    L.push(`- Pérdida acumulada: **${perdidoTotal > 0 ? "−" + perdidoTotal.toFixed(1) + " kg" : "—"}**`);
    if (bl.length) {
      L.push(`- Pesajes en el periodo:`);
      bl.forEach((b) => L.push(`  - ${fmtDate(b.fecha)}: ${b.peso !== "" ? b.peso + " kg" : "—"}${b.cintura !== "" ? `, cintura ${b.cintura} cm` : ""}${b.grasa !== "" ? `, grasa ${b.grasa}%` : ""}`));
    }
    L.push(``);
    L.push(`## Entrenos (${wk.length})`);
    L.push(`- RPE medio: **${rpeMedia}** · Sensación lumbar media: **${lumbarMedia}/5**`);
    if (wk.length) {
      wk.forEach((w) => {
        L.push(`- **${fmtDate(w.fecha)} · ${w.sesionNombre}** — RPE ${w.rpe ?? "—"}, lumbar ${w.lumbar ?? "—"}/5${w.notas ? ` — _${w.notas}_` : ""}`);
      });
    } else {
      L.push(`- Sin entrenos registrados en el periodo.`);
    }
    L.push(``);
    if (prMap.size) {
      L.push(`## Mejores series del periodo`);
      Array.from(prMap.entries())
        .sort((a, b) => b[1].kg - a[1].kg)
        .forEach(([n, b]) => L.push(`- ${n}: **${b.kg} kg × ${b.reps}**`));
      L.push(``);
    }
    L.push(`## Nutrición`);
    L.push(`- Días registrados: ${nut.length} · días limpios: ${diasLimpios}`);
    L.push(`- **Adherencia: ${adherencia}%**`);
    L.push(`- Proteína OK: ${nut.filter((n) => n.proteinaOk).length}/${nut.length} · Hidratación OK: ${nut.filter((n) => n.hidratacionOk).length}/${nut.length} · Sueño OK: ${nut.filter((n) => n.suenoOk).length}/${nut.length}`);
    L.push(`- Antojos/atracones: ${nut.filter((n) => n.antojo).length}`);
    L.push(``);

    // Suplementación
    const totalMomentos = SUPLEMENTACION.protocolo.length;
    const supDias = Object.entries(suplementosDia)
      .filter(([fecha, moms]) => moms.length > 0 && new Date(fecha) >= desde)
      .sort(([a], [b]) => (a > b ? -1 : 1));
    if (supDias.length > 0) {
      L.push(`## Suplementación`);
      const conteo: Record<string, number> = {};
      for (const [, moms] of supDias) for (const m of moms) conteo[m] = (conteo[m] ?? 0) + 1;
      for (const p of SUPLEMENTACION.protocolo as any[]) {
        L.push(`- ${p.momento} (${p.items.join(", ")}): **${conteo[p.momento] ?? 0}/${supDias.length} días**`);
      }
      L.push(`- Detalle por día:`);
      supDias.forEach(([fecha, moms]) =>
        L.push(`  - ${fmtDate(fecha)}: ${moms.join(" · ")} (${moms.length}/${totalMomentos})`)
      );
      L.push(``);
    }

    // Diario de alimentación (recetas + comidas libres)
    const diasDiario = Array.from(
      new Set([...Object.keys(comidasDia), ...Object.keys(comidasLibres)])
    )
      .filter((fecha) => new Date(fecha) >= desde)
      .sort((a, b) => (a > b ? -1 : 1));

    if (diasDiario.length > 0) {
      L.push(`## Diario de alimentación`);
      for (const fecha of diasDiario) {
        const ids = comidasDia[fecha] ?? [];
        const libres = comidasLibres[fecha] ?? [];
        if (!ids.length && !libres.length) continue;
        const recetasDelDia = allRecipes.filter((r) => ids.includes(r.id));
        let totalKcal = recetasDelDia.reduce((s, r) => s + r.kcal, 0);
        const totalMacros = recetasDelDia.reduce(
          (acc, r) => { const m = parseMacrosRep(r.macros); return { p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g }; },
          { p: 0, c: 0, g: 0 }
        );
        for (const x of libres) {
          totalKcal += x.kcal;
          totalMacros.p += x.p; totalMacros.c += x.c; totalMacros.g += x.g;
        }
        L.push(`### ${fmtDate(fecha)} · ${Math.round(totalKcal)} kcal · ${totalMacros.p}P/${totalMacros.c}C/${totalMacros.g}G`);
        const porMom: Record<string, any[]> = {};
        for (const r of recetasDelDia) (porMom[r.momento] ||= []).push(r);
        for (const [mom, rs] of Object.entries(porMom)) {
          L.push(`- **${mom}:** ${rs.map((r) => `${r.nombre} (${r.kcal} kcal · ${r.macros})`).join(", ")}`);
        }
        if (libres.length) {
          L.push(`- **Libre:** ${libres.map((x) => `${x.nombre} (${x.kcal} kcal · ${x.p}P/${x.c}C/${x.g}G)`).join(", ")}`);
        }
      }
      L.push(``);
    }

    L.push(`---`);
    L.push(`_Para el entrenador: con esto ajustamos cargas, calorías y la siguiente fase. Escribe "revisión semana X" para generar el nuevo bloque._`);
    return L.join("\n");
  }, [mounted, weeks, workouts, bodyLogs, nutricion, comidasDia, comidasLibres, suplementosDia, plan, planStart]);

  async function copy() {
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  function download() {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-roxu-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Reporte Roxu", text: md });
      } catch {}
    } else {
      copy();
    }
  }
  async function excel() {
    await exportExcel({
      plan, planStart, workouts, bodyLogs, nutricion, comidasDia, comidasLibres, suplementosDia,
      recetas: RECETAS.recetas as any[],
    });
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Para el entrenador" title="Reportes" back="/" />

      <div className="card">
        <div className="label mb-2">{t("Periodo")}</div>
        <div className="flex gap-2">
          {[2, 4, 8].map((w) => (
            <button
              key={w}
              onClick={() => setWeeks(w)}
              className={`flex-1 rounded-xl border py-2 text-sm transition ${
                weeks === w ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
              }`}
            >
              {w} {t("sem")}
            </button>
          ))}
        </div>
      </div>

      <button onClick={excel} className="btn-accent mt-4 w-full justify-center gap-2">
        <FileSpreadsheet size={18} /> {t("Exportar Excel para el entrenador (.xlsx)")}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted">
        {t("Mismo formato que tu hoja de seguimiento · Pesajes, Entrenos y Nutrición")}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={copy} className="btn-ghost flex-col py-3 text-xs">
          {copied ? <Check size={18} className="text-good" /> : <Copy size={18} />}
          {copied ? t("Copiado") : t("Copiar")}
        </button>
        <button onClick={download} className="btn-ghost flex-col py-3 text-xs">
          <Download size={18} /> {t("Markdown")}
        </button>
        <button onClick={share} className="btn-ghost flex-col py-3 text-xs">
          <Share2 size={18} /> {t("Compartir")}
        </button>
      </div>

      <h2 className="section-title mt-6 mb-2 text-xl">{t("Vista previa del resumen")}</h2>
      <pre className="card overflow-x-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-muted">
        {md || t("Genera datos entrenando y registrando para ver tu reporte.")}
      </pre>
    </div>
  );
}
