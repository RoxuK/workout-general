"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Upload, Trash2, Smartphone, Check, Bell, ChevronRight, FileSpreadsheet, Palette } from "lucide-react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { useActivePlan, useRecipes } from "@/lib/user-content";
import { exportExcel } from "@/lib/export-excel";
import { THEMES, getTheme, applyTheme, type ThemeId } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { Languages } from "lucide-react";

export default function Ajustes() {
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutrition = useStore((s) => s.nutrition);
  const freeMeals = useStore((s) => s.freeMeals);
  const recipesEaten = useStore((s) => s.recipesEaten);
  const planStart = useStore((s) => s.planStart);
  const schedule = useStore((s) => s.schedule);
  const importData = useStore((s) => s.importData);
  const clearAll = useStore((s) => s.clearAll);
  const resetUser = useStore((s) => s.resetUser);
  const plan = useActivePlan();
  const recipes = useRecipes();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function exportar() {
    const data = { version: 6, exportedAt: new Date().toISOString(), workouts, bodyLogs, nutrition, freeMeals, recipesEaten, planStart, schedule };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fitplan-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Backup descargado");
  }

  async function exportarExcel() {
    try {
      await exportExcel({ plan, planStart, workouts, bodyLogs, nutrition, freeMeals, recipes, recipesEaten });
      flash("Excel descargado");
    } catch {
      flash("No se pudo generar el Excel");
    }
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        importData({
          workouts: data.workouts,
          bodyLogs: data.bodyLogs,
          nutrition: data.nutrition,
          freeMeals: data.freeMeals,
          recipesEaten: data.recipesEaten,
          planStart: data.planStart,
          schedule: data.schedule,
        });
        flash("Datos importados");
      } catch {
        flash("Archivo no válido");
      }
    };
    reader.readAsText(file);
  }

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(""), 1800);
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Tu app" title="Ajustes" back="/" />

      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-good/40 bg-good/10 p-3 text-sm text-good">
          <Check size={16} /> {msg}
        </div>
      )}

      <ThemePicker />
      <LangPicker />

      <Link href="/recordatorios" className="mb-4 card-2 flex items-center justify-between">
        <span className="flex items-center gap-3">
          <Bell size={18} className="text-accent" />
          <span>
            <span className="block text-sm">{t("Recordatorios")}</span>
            <span className="block text-xs text-muted">{t("Notificaciones de entreno, agua y suplementos")}</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <div className="card">
        <div className="label mb-1">{t("Tus datos")}</div>
        <p className="text-sm text-muted">
          {workouts.length} {t("entrenos")} · {bodyLogs.length} {t("pesajes")} · {Object.keys(nutrition).length} {t("días de nutrición.")}{" "}
          {t("Todo se guarda en este teléfono.")}
        </p>
      </div>

      <div className="mt-4 card border-accent/30">
        <div className="mb-1 flex items-center gap-2 font-medium text-accent">
          <FileSpreadsheet size={18} /> {t("Exportar")}
        </div>
        <p className="mb-3 text-xs text-muted">
          {t("Genera un Excel con tus pesajes, entrenos y nutrición.")}
        </p>
        <button onClick={exportarExcel} className="btn-accent w-full justify-center gap-2">
          <FileSpreadsheet size={18} /> {t("Descargar Excel (.xlsx)")}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <button onClick={exportar} className="btn-ghost w-full justify-start gap-3">
          <Download size={18} className="text-accent" /> {t("Copia de seguridad (.json)")}
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full justify-start gap-3">
          <Upload size={18} className="text-accent" /> {t("Importar copia (.json)")}
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
        <button
          onClick={() => {
            if (confirm("¿Borrar TODOS tus registros locales? Esto no se puede deshacer.")) {
              clearAll();
              flash("Datos borrados");
            }
          }}
          className="btn w-full justify-start gap-3 border border-bad/40 bg-bad/10 text-bad"
        >
          <Trash2 size={18} /> {t("Borrar todos los datos")}
        </button>
        <button
          onClick={() => {
            if (confirm("This will delete your plan and all data, and take you back to setup. Continue?")) {
              resetUser();
            }
          }}
          className="btn w-full justify-start gap-3 border border-bad/40 bg-bad/10 text-bad"
        >
          <Trash2 size={18} /> Reset / Switch user
        </button>
      </div>

      <div className="mt-6 card">
        <div className="mb-2 flex items-center gap-2 font-medium text-accent">
          <Smartphone size={18} /> {t("Instalar como app")}
        </div>
        <ol className="space-y-1 text-sm text-muted">
          <li>1. {t("Abre esta web en Chrome en tu Android.")}</li>
          <li>2. {t("Menú (⋮) →")} <span className="text-ink">{t("Añadir a pantalla de inicio")}</span>.</li>
          <li>3. {t("Ábrela desde el icono: pantalla completa y funciona offline.")}</li>
        </ol>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">FitPlan — v0.1</p>
    </div>
  );
}

function ThemePicker() {
  const tr = useT();
  const [theme, setTheme] = useState<ThemeId>("oro");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
  }, []);

  function pick(id: ThemeId) {
    setTheme(id);
    applyTheme(id);
  }

  return (
    <div className="mb-4 card">
      <div className="mb-3 flex items-center gap-2 font-medium text-accent">
        <Palette size={18} /> {tr("Tema de la app")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((th) => {
          const active = mounted && theme === th.id;
          return (
            <button
              key={th.id}
              onClick={() => pick(th.id)}
              className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                active ? "border-accent bg-accent-soft" : "border-line bg-surface-2"
              }`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line"
                style={{ background: th.swatch[0] }}
              >
                <span className="h-4 w-4 rounded-full" style={{ background: th.swatch[1] }} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-tight">{tr(th.name)}</span>
                <span className="block text-[10px] leading-tight text-muted">{tr(th.desc)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LangPicker() {
  const tr = useT();
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const opts: { id: "es" | "en"; label: string }[] = [
    { id: "en", label: "English" },
    { id: "es", label: "Español" },
  ];
  return (
    <div className="mb-4 card">
      <div className="mb-3 flex items-center gap-2 font-medium text-accent">
        <Languages size={18} /> {tr("Idioma")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => setLang(o.id)}
            className={`rounded-2xl border p-3 text-center text-sm transition active:scale-[0.98] ${
              lang === o.id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface-2 text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
