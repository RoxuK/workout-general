"use client";

import { useEffect, useState } from "react";
import { Check, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import { useNutritionTargets } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { NutritionLog } from "@/lib/types";
import { dayKey } from "@/lib/utils";
import ComidaLibreButton from "@/components/ComidaLibre";
import { useT } from "@/lib/i18n";

const blank = (date: string): NutritionLog => ({
  date,
  proteinGoalMet: false,
  ateOut: false,
  hydrationGoalMet: false,
  sleepGoalMet: false,
  craving: false,
  cleanDay: false,
  notes: "",
});

export default function Nutricion() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = dayKey();

  const stored = useStore((s) => s.nutrition[today]);
  const setNutritionLog = useStore((s) => s.setNutritionLog);
  const t = useT();
  const nut = useNutritionTargets();
  const log = mounted ? stored ?? blank(today) : blank(today);

  function toggle(k: keyof NutritionLog) {
    setNutritionLog({ ...log, [k]: !log[k] });
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Objetivo diario" title="Nutrición" />

      {/* Macro targets */}
      <div className="card">
        <div className="flex items-end justify-between">
          <div>
            <div className="label">{t("Calorías objetivo")}</div>
            <div className="font-display text-4xl">{nut.kcal}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Macro label={t("Proteína")} g={nut.protein} color="var(--good)" />
          <Macro label={t("Carbos")} g={nut.carbs} color="var(--accent)" />
          <Macro label={t("Grasa")} g={nut.fats} color="var(--warn)" />
        </div>
        {nut.note && <p className="mt-3 text-[11px] text-muted">{t(nut.note)}</p>}
      </div>

      {/* Today's macro tracker */}
      {mounted && <MacroTracker />}

      {/* Today's check */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Check de hoy")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Toggle on={log.proteinGoalMet} onClick={() => toggle("proteinGoalMet")} label={t("Proteína OK")} />
        <Toggle on={log.hydrationGoalMet} onClick={() => toggle("hydrationGoalMet")} label={t("3 L agua")} />
        <Toggle on={log.sleepGoalMet} onClick={() => toggle("sleepGoalMet")} label={t("7–8 h sueño")} />
        <Toggle on={log.ateOut} onClick={() => toggle("ateOut")} label={t("Comí fuera")} neutral />
        <Toggle on={log.craving} onClick={() => toggle("craving")} label={t("Antojo / atracón")} warn />
        <Toggle on={log.cleanDay} onClick={() => toggle("cleanDay")} label={t("Día limpio ✓")} />
      </div>
    </div>
  );
}

// ─── MacroTracker ─────────────────────────────────────────────────────────────────

function MacroTracker() {
  const today = dayKey();
  const t = useT();
  const nut = useNutritionTargets();
  const freeMealsRaw = useStore((s) => s.freeMeals[today]);
  const freeMealsToday = freeMealsRaw ?? [];
  const removeFreeMeal = useStore((s) => s.removeFreeMeal);

  const totals = freeMealsToday.reduce(
    (acc, x) => ({ kcal: acc.kcal + x.kcal, p: acc.p + x.p, c: acc.c + x.c, g: acc.g + x.g }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
  const logged = freeMealsToday.length;

  return (
    <div className="mt-4 card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" />
          <span className="label">{t("Consumido hoy")}</span>
        </div>
        {logged > 0 && (
          <span className="text-[11px] text-muted">
            {Math.round(totals.kcal)} {t("kcal totales")}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <MacroBar label={t("Calorías")} val={totals.kcal} max={nut.kcal} unit="kcal" color="var(--accent)" />
        <MacroBar label={t("Proteína")} val={totals.p} max={nut.protein} unit="g" color="var(--good)" />
        <MacroBar label={t("Carbos")} val={totals.c} max={nut.carbs} unit="g" color="var(--accent)" />
        <MacroBar label={t("Grasa")} val={totals.g} max={nut.fats} unit="g" color="var(--warn)" />
      </div>

      {logged === 0 ? (
        <p className="mt-3 text-center text-[11px] text-muted">
          {t("Añade lo que vayas comiendo con el botón de abajo ↓")}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
          {freeMealsToday.map((x) => (
            <button
              key={x.id}
              onClick={() => removeFreeMeal(today, x.id)}
              className="flex items-center gap-1 rounded-full border border-warn/40 bg-warn/5 px-2 py-0.5 text-[10px] text-warn transition hover:border-bad/50 hover:bg-bad/10 hover:text-bad"
              title="Quitar"
            >
              {x.name.split(" ").slice(0, 4).join(" ")} · {x.kcal} kcal ×
            </button>
          ))}
        </div>
      )}

      <ComidaLibreButton />
    </div>
  );
}

function MacroBar({
  label, val, max, unit, color,
}: {
  label: string; val: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  const over = val > max * 1.05; // 5% tolerance
  const barColor = over ? "var(--bad)" : color;
  const textColor = over ? "var(--bad)" : pct >= 80 ? color : "var(--muted)";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] tabular-nums" style={{ color: textColor }}>
          {Math.round(val)} / {max} {unit}
          {pct >= 95 && !over && " ✓"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ─── UI helpers ───────────────────────────────────────────────────────────────────────────────

function Macro({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <div className="card-2 py-3 text-center">
      <div className="font-display text-2xl" style={{ color }}>{g}<span className="text-sm">g</span></div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Toggle({
  on, onClick, label, warn, neutral,
}: {
  on: boolean; onClick: () => void; label: string; warn?: boolean; neutral?: boolean;
}) {
  const active = on
    ? warn
      ? "border-bad/60 bg-bad/10 text-bad"
      : neutral
      ? "border-line bg-surface-2 text-ink"
      : "border-good/60 bg-good/10 text-good"
    : "border-line bg-surface text-muted";
  return (
    <button onClick={onClick} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition active:scale-[0.98] ${active}`}>
      {label}
      <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-current" : "border-line"}`}>
        {on && <Check size={13} />}
      </span>
    </button>
  );
}
