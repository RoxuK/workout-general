"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, Check, FileSpreadsheet } from "lucide-react";
import Header from "@/components/Header";
import { useActivePlan, useRecipes } from "@/lib/user-content";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { buildReportMd } from "@/lib/report";
import { exportExcel } from "@/lib/export-excel";

export default function Reportes() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [weeks, setWeeks] = useState(2);
  const [copied, setCopied] = useState(false);
  const t = useT();

  const plan = useActivePlan();
  const recipes = useRecipes();
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutrition = useStore((s) => s.nutrition);
  const freeMeals = useStore((s) => s.freeMeals);
  const recipesEaten = useStore((s) => s.recipesEaten);
  const planStart = useStore((s) => s.planStart);

  const md = useMemo(() => {
    if (!mounted) return "";
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);
    return buildReportMd(
      { plan, planStart, workouts, bodyLogs, nutrition, freeMeals, recipes, recipesEaten },
      since,
      `last ${weeks} weeks`
    );
  }, [mounted, weeks, workouts, bodyLogs, nutrition, freeMeals, recipesEaten, recipes, plan, planStart]);

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
    await exportExcel({ plan, planStart, workouts, bodyLogs, nutrition, freeMeals, recipes, recipesEaten });
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
