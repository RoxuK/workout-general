"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

function monday(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

type Stats = { workouts: number; tonnage: number; clean: number; logged: number };

export default function WeeklySummary() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutrition = useStore((s) => s.nutrition);
  const t = useT();

  const data = useMemo(() => {
    if (!mounted) return null;
    const today = new Date();
    const weekStart = monday(today);
    const prevStart = new Date(weekStart);
    prevStart.setDate(prevStart.getDate() - 7);

    const calc = (from: Date, to: Date): Stats => {
      const wk = workouts.filter((w) => {
        const t = new Date(w.date).getTime();
        return t >= from.getTime() && t < to.getTime();
      });
      let ton = 0;
      for (const w of wk)
        for (const e of w.exercises)
          for (const s of e.sets) {
            const kg = typeof s.kg === "number" ? s.kg : 0;
            const reps = typeof s.reps === "number" ? s.reps : 0;
            if (kg > 0 && reps > 0) ton += kg * reps;
          }
      const nut = Object.values(nutrition).filter((n) => {
        const t = new Date(n.date + "T12:00:00").getTime();
        return t >= from.getTime() && t < to.getTime();
      });
      return {
        workouts: wk.length,
        tonnage: Math.round(ton),
        clean: nut.filter((n) => n.cleanDay).length,
        logged: nut.length,
      };
    };

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const current = calc(weekStart, weekEnd);
    const prev = calc(prevStart, weekStart);

    // Weight trend: latest weigh-in vs the closest one to 7 days ago
    const withWeight = bodyLogs.filter((b) => b.weight !== "");
    const latest = withWeight[0];
    let weightDelta: number | null = null;
    if (latest) {
      const refT = new Date(latest.date).getTime() - 7 * 86400000;
      const ref = [...withWeight]
        .filter((b) => b.id !== latest.id)
        .sort((a, b) => Math.abs(new Date(a.date).getTime() - refT) - Math.abs(new Date(b.date).getTime() - refT))[0];
      if (ref) weightDelta = +(Number(latest.weight) - Number(ref.weight)).toFixed(1);
    }

    return { current, prev, weightDelta };
  }, [mounted, workouts, bodyLogs, nutrition]);

  if (!data) return null;
  const { current, prev, weightDelta } = data;
  const noData = current.workouts === 0 && current.logged === 0 && weightDelta == null;
  if (noData && prev.workouts === 0 && prev.logged === 0) return null;

  return (
    <section className="mt-4 card">
      <div className="mb-3 flex items-center gap-2">
        <CalendarRange size={15} className="text-accent" />
        <span className="label">{t("Tu semana")}</span>
        <span className="ml-auto text-[10px] text-muted">{t("vs semana pasada")}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Item
          value={`${current.workouts}/4`}
          label={t("Entrenos")}
          delta={current.workouts - prev.workouts}
          unit=""
        />
        <Item
          value={current.tonnage >= 1000 ? `${(current.tonnage / 1000).toFixed(1)}t` : `${current.tonnage}`}
          label={t("Kg movidos")}
          delta={current.tonnage - prev.tonnage}
          unit=" kg"
        />
        <Item
          value={current.logged ? `${current.clean}/${current.logged}` : "—"}
          label={t("Días limpios")}
          delta={current.clean - prev.clean}
          unit=""
        />
      </div>

      {weightDelta != null && (
        <p className={`mt-3 flex items-center justify-center gap-1.5 border-t border-line pt-2.5 text-xs ${weightDelta < 0 ? "text-good" : "text-muted"}`}>
          {weightDelta < 0 ? <TrendingDown size={14} /> : weightDelta > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
          {t("Peso:")} {weightDelta < 0 ? `−${Math.abs(weightDelta)}` : weightDelta > 0 ? `+${weightDelta}` : t("igual")} kg {t("en ~7 días")}
        </p>
      )}
    </section>
  );
}

function Item({ value, label, delta, unit }: { value: string; label: string; delta: number; unit: string }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <div className="font-display text-xl tabular-nums">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
      {delta !== 0 && (
        <div className={`mt-0.5 text-[10px] tabular-nums ${delta > 0 ? "text-good" : "text-muted"}`}>
          {delta > 0 ? "+" : "−"}
          {Math.abs(delta) >= 1000 ? `${(Math.abs(delta) / 1000).toFixed(1)}t` : Math.abs(delta)}
          {Math.abs(delta) < 1000 ? unit : ""}
        </div>
      )}
    </div>
  );
}
