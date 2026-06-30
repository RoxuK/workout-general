"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, Check, FileSpreadsheet } from "lucide-react";
import Header from "@/components/Header";
import { effectiveStartingWeight, latestWeight } from "@/lib/content";
import { useActivePlan } from "@/lib/user-content";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { bestSet, fmtDate } from "@/lib/utils";
import { exportExcel } from "@/lib/export-excel";

export default function Reportes() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [weeks, setWeeks] = useState(2);
  const [copied, setCopied] = useState(false);
  const t = useT();

  const plan = useActivePlan();
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutrition = useStore((s) => s.nutrition);
  const freeMeals = useStore((s) => s.freeMeals);
  const planStart = useStore((s) => s.planStart);

  const md = useMemo(() => {
    if (!mounted) return "";
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const wk = workouts.filter((w) => new Date(w.date) >= since);
    const bl = bodyLogs.filter((b) => new Date(b.date) >= since);
    const nut = Object.values(nutrition).filter((n) => new Date(n.date) >= since);

    const baseWeight = effectiveStartingWeight(plan, bodyLogs, planStart);
    const lastWeight = latestWeight(bodyLogs);
    const totalLost = lastWeight != null ? baseWeight - lastWeight : 0;

    const cleanDays = nut.filter((n) => n.cleanDay).length;
    const adherence = nut.length ? Math.round((cleanDays / nut.length) * 100) : 0;
    const lowerBackVals = wk.filter((w) => w.lowerBack != null).map((w) => w.lowerBack as number);
    const lowerBackAvg = lowerBackVals.length
      ? (lowerBackVals.reduce((a, b) => a + b, 0) / lowerBackVals.length).toFixed(1)
      : "—";
    const rpeVals = wk.filter((w) => w.rpe != null).map((w) => w.rpe as number);
    const rpeAvg = rpeVals.length
      ? (rpeVals.reduce((a, b) => a + b, 0) / rpeVals.length).toFixed(1)
      : "—";

    // Best sets per exercise in the period
    const prMap = new Map<string, { kg: number; reps: number }>();
    for (const w of wk) {
      for (const e of w.exercises) {
        const b = bestSet(e.sets);
        if (!b) continue;
        const cur = prMap.get(e.name);
        if (!cur || b.kg > cur.kg) prMap.set(e.name, b);
      }
    }

    const L: string[] = [];
    L.push(`# Training report`);
    L.push(`**Period:** last ${weeks} weeks · generated ${fmtDate(new Date().toISOString())}`);
    L.push(`**Plan:** ${plan.name}`);
    L.push(``);
    L.push(`## Weight and composition`);
    L.push(`- Starting weight: **${baseWeight} kg** · target **${plan.targetWeight} kg**`);
    L.push(`- Latest weight: **${lastWeight != null ? lastWeight + " kg" : "not logged"}**`);
    L.push(`- Total lost: **${totalLost > 0 ? "−" + totalLost.toFixed(1) + " kg" : "—"}**`);
    if (bl.length) {
      L.push(`- Weigh-ins in this period:`);
      bl.forEach((b) => L.push(`  - ${fmtDate(b.date)}: ${b.weight !== "" ? b.weight + " kg" : "—"}${b.waist !== "" ? `, waist ${b.waist} cm` : ""}${b.bodyFat !== "" ? `, body fat ${b.bodyFat}%` : ""}`));
    }
    L.push(``);
    L.push(`## Workouts (${wk.length})`);
    L.push(`- Average RPE: **${rpeAvg}** · Average lower back rating: **${lowerBackAvg}/5**`);
    if (wk.length) {
      wk.forEach((w) => {
        L.push(`- **${fmtDate(w.date)} · ${w.sessionName}** — RPE ${w.rpe ?? "—"}, lower back ${w.lowerBack ?? "—"}/5${w.notes ? ` — _${w.notes}_` : ""}`);
      });
    } else {
      L.push(`- No workouts logged in this period.`);
    }
    L.push(``);
    if (prMap.size) {
      L.push(`## Best sets this period`);
      Array.from(prMap.entries())
        .sort((a, b) => b[1].kg - a[1].kg)
        .forEach(([n, b]) => L.push(`- ${n}: **${b.kg} kg × ${b.reps}**`));
      L.push(``);
    }
    L.push(`## Nutrition`);
    L.push(`- Days logged: ${nut.length} · clean days: ${cleanDays}`);
    L.push(`- **Adherence: ${adherence}%**`);
    L.push(`- Protein met: ${nut.filter((n) => n.proteinGoalMet).length}/${nut.length} · Hydration met: ${nut.filter((n) => n.hydrationGoalMet).length}/${nut.length} · Sleep met: ${nut.filter((n) => n.sleepGoalMet).length}/${nut.length}`);
    L.push(`- Cravings: ${nut.filter((n) => n.craving).length}`);
    L.push(``);

    // Food diary (free meals)
    const diaryDays = Object.keys(freeMeals)
      .filter((date) => new Date(date) >= since && (freeMeals[date]?.length ?? 0) > 0)
      .sort((a, b) => (a > b ? -1 : 1));

    if (diaryDays.length > 0) {
      L.push(`## Food diary`);
      for (const date of diaryDays) {
        const meals = freeMeals[date] ?? [];
        const totalKcal = meals.reduce((s, x) => s + x.kcal, 0);
        const totals = meals.reduce(
          (acc, x) => ({ p: acc.p + x.p, c: acc.c + x.c, g: acc.g + x.g }),
          { p: 0, c: 0, g: 0 }
        );
        L.push(`### ${fmtDate(date)} · ${Math.round(totalKcal)} kcal · ${totals.p}P/${totals.c}C/${totals.g}G`);
        L.push(`- ${meals.map((x) => `${x.name} (${x.kcal} kcal · ${x.p}P/${x.c}C/${x.g}G)`).join(", ")}`);
      }
      L.push(``);
    }

    L.push(`---`);
    L.push(`_Use this to adjust load, calories and the next phase._`);
    return L.join("\n");
  }, [mounted, weeks, workouts, bodyLogs, nutrition, freeMeals, plan, planStart]);

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
    a.download = `training-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Training report", text: md });
      } catch {}
    } else {
      copy();
    }
  }
  async function excel() {
    await exportExcel({ plan, planStart, workouts, bodyLogs, nutrition, freeMeals });
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Resumen exportable" title="Reportes" back="/" />

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
        <FileSpreadsheet size={18} /> {t("Exportar Excel (.xlsx)")}
      </button>

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
