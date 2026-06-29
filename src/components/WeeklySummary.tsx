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

type Stats = { entrenos: number; tonelaje: number; limpios: number; registrados: number };

export default function WeeklySummary() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutricion = useStore((s) => s.nutricion);
  const t = useT();

  const data = useMemo(() => {
    if (!mounted) return null;
    const hoy = new Date();
    const iniSemana = monday(hoy);
    const iniPrev = new Date(iniSemana);
    iniPrev.setDate(iniPrev.getDate() - 7);

    const calc = (desde: Date, hasta: Date): Stats => {
      const wk = workouts.filter((w) => {
        const t = new Date(w.fecha).getTime();
        return t >= desde.getTime() && t < hasta.getTime();
      });
      let ton = 0;
      for (const w of wk)
        for (const e of w.ejercicios)
          for (const s of e.sets) {
            const kg = typeof s.kg === "number" ? s.kg : 0;
            const reps = typeof s.reps === "number" ? s.reps : 0;
            if (kg > 0 && reps > 0) ton += kg * reps;
          }
      const nut = Object.values(nutricion).filter((n) => {
        const t = new Date(n.fecha + "T12:00:00").getTime();
        return t >= desde.getTime() && t < hasta.getTime();
      });
      return {
        entrenos: wk.length,
        tonelaje: Math.round(ton),
        limpios: nut.filter((n) => n.diaLimpio).length,
        registrados: nut.length,
      };
    };

    const finSemana = new Date(iniSemana);
    finSemana.setDate(finSemana.getDate() + 7);
    const actual = calc(iniSemana, finSemana);
    const prev = calc(iniPrev, iniSemana);

    // Tendencia de peso: último pesaje vs el más cercano a hace 7 días
    const conPeso = bodyLogs.filter((b) => b.peso !== "");
    const ultimo = conPeso[0];
    let deltaPeso: number | null = null;
    if (ultimo) {
      const refT = new Date(ultimo.fecha).getTime() - 7 * 86400000;
      const ref = [...conPeso]
        .filter((b) => b.id !== ultimo.id)
        .sort((a, b) => Math.abs(new Date(a.fecha).getTime() - refT) - Math.abs(new Date(b.fecha).getTime() - refT))[0];
      if (ref) deltaPeso = +(Number(ultimo.peso) - Number(ref.peso)).toFixed(1);
    }

    return { actual, prev, deltaPeso };
  }, [mounted, workouts, bodyLogs, nutricion]);

  if (!data) return null;
  const { actual, prev, deltaPeso } = data;
  const sinDatos = actual.entrenos === 0 && actual.registrados === 0 && deltaPeso == null;
  if (sinDatos && prev.entrenos === 0 && prev.registrados === 0) return null;

  return (
    <section className="mt-4 card">
      <div className="mb-3 flex items-center gap-2">
        <CalendarRange size={15} className="text-accent" />
        <span className="label">{t("Tu semana")}</span>
        <span className="ml-auto text-[10px] text-muted">{t("vs semana pasada")}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Item
          valor={`${actual.entrenos}/4`}
          label={t("Entrenos")}
          delta={actual.entrenos - prev.entrenos}
          unidad=""
        />
        <Item
          valor={actual.tonelaje >= 1000 ? `${(actual.tonelaje / 1000).toFixed(1)}t` : `${actual.tonelaje}`}
          label={t("Kg movidos")}
          delta={actual.tonelaje - prev.tonelaje}
          unidad=" kg"
        />
        <Item
          valor={actual.registrados ? `${actual.limpios}/${actual.registrados}` : "—"}
          label={t("Días limpios")}
          delta={actual.limpios - prev.limpios}
          unidad=""
        />
      </div>

      {deltaPeso != null && (
        <p className={`mt-3 flex items-center justify-center gap-1.5 border-t border-line pt-2.5 text-xs ${deltaPeso < 0 ? "text-good" : "text-muted"}`}>
          {deltaPeso < 0 ? <TrendingDown size={14} /> : deltaPeso > 0 ? <TrendingUp size={14} /> : <Minus size={14} />}
          {t("Peso:")} {deltaPeso < 0 ? `−${Math.abs(deltaPeso)}` : deltaPeso > 0 ? `+${deltaPeso}` : t("igual")} kg {t("en ~7 días")}
        </p>
      )}
    </section>
  );
}

function Item({ valor, label, delta, unidad }: { valor: string; label: string; delta: number; unidad: string }) {
  return (
    <div className="rounded-xl bg-surface-2 py-2.5">
      <div className="font-display text-xl tabular-nums">{valor}</div>
      <div className="text-[10px] text-muted">{label}</div>
      {delta !== 0 && (
        <div className={`mt-0.5 text-[10px] tabular-nums ${delta > 0 ? "text-good" : "text-muted"}`}>
          {delta > 0 ? "+" : "−"}
          {Math.abs(delta) >= 1000 ? `${(Math.abs(delta) / 1000).toFixed(1)}t` : Math.abs(delta)}
          {Math.abs(delta) < 1000 ? unidad : ""}
        </div>
      )}
    </div>
  );
}
