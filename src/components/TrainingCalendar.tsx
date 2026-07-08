"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays, ChevronDown, CalendarClock, X, Check, Dumbbell } from "lucide-react";
import { useStore } from "@/lib/store";
import { planWeek, currentPhase, planStarted } from "@/lib/content";
import { useActivePlan } from "@/lib/user-content";
import { dayKey } from "@/lib/utils";
import { useT, useLang } from "@/lib/i18n";

const DOW = ["L", "M", "X", "J", "V", "S", "D"];
const DOW_EN = ["M", "T", "W", "T", "F", "S", "S"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "Upper A" -> "UA", "Lower B" -> "LB"
function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]?.toUpperCase()).join("").slice(0, 3);
}

export default function TrainingCalendar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const workouts = useStore((s) => s.workouts);
  const planStart = useStore((s) => s.planStart);
  const setPlanStart = useStore((s) => s.setPlanStart);
  const schedule = useStore((s) => s.schedule);
  const setSchedule = useStore((s) => s.setSchedule);

  const plan = useActivePlan();
  const t = useT();
  const lang = useLang();
  const meses = lang === "en" ? MESES_EN : MESES;
  const dow = lang === "en" ? DOW_EN : DOW;
  const [expanded, setExpanded] = useState(true);
  const [editStart, setEditStart] = useState(false);
  const [picker, setPicker] = useState<string | null>(null); // selected dayKey

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Trained (logged) days
  const trained = useMemo(() => {
    const set = new Map<string, number>();
    if (mounted) {
      for (const w of workouts) {
        const k = dayKey(new Date(w.date));
        set.set(k, (set.get(k) ?? 0) + 1);
      }
    }
    return set;
  }, [workouts, mounted]);

  const start = mounted ? (planStart || plan.startDate) : plan.startDate;
  const startDate = new Date(start + (start.length === 10 ? "T00:00:00" : ""));

  const week = mounted ? planWeek(plan, new Date(), planStart) : 1;
  const phase = mounted ? currentPhase(plan, new Date(), planStart) : plan.phases[0]?.name;
  const started = mounted ? planStarted(plan, planStart) : true;

  const first = new Date(cursor.y, cursor.m, 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const todayKey = dayKey();

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const scheduledThisMonth = mounted
    ? Object.keys(schedule).filter((k) => {
        const [y, m] = k.split("-").map(Number);
        return y === cursor.y && m === cursor.m + 1;
      }).length
    : 0;

  function shift(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const pickerSession = picker ? schedule[picker] : undefined;
  const sessionOf = (id?: string) => plan.sessions.find((s) => s.id === id);

  return (
    <section className="mt-4 card">
      {/* Header: plan status + dropdown */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2 text-left">
          <CalendarDays size={16} className="text-accent" />
          <div>
            <div className="text-sm font-medium">
              {started ? `${t("Semana")} ${week} · ${t(phase ?? "")}` : t("Plan aún sin empezar")}
            </div>
            <div className="text-[11px] text-muted">
              {mounted ? (
                <>{t("Inicio:")} {startDate.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short", year: "numeric" })}</>
              ) : "…"}
            </div>
          </div>
        </div>
        <ChevronDown size={18} className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* Start date picker (adjustable) */}
      {mounted && (
        <div className="mt-3">
          {!editStart ? (
            <button
              onClick={() => setEditStart(true)}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"
            >
              <span className="flex items-center gap-2 text-muted">
                <CalendarClock size={14} className="text-accent" />
                {planStart ? t("Cambiar fecha de inicio del plan") : t("Fijar cuándo empiezas el plan")}
              </span>
              <span className="text-accent">{planStart ? t("Editar") : t("Elegir")}</span>
            </button>
          ) : (
            <div className="rounded-xl border border-accent/40 bg-surface-2 p-3">
              <label className="mb-1 block text-[11px] text-muted">
                {t("¿Qué día empiezas (o empezaste) el plan?")}
              </label>
              <input
                type="date"
                defaultValue={planStart || dayKey()}
                onChange={(e) => setPlanStart(e.target.value || null)}
                className="input text-sm"
              />
              <div className="mt-2 flex gap-2">
                <button onClick={() => setEditStart(false)} className="btn-accent flex-1 py-2 text-sm">{t("Listo")}</button>
                {planStart && (
                  <button onClick={() => { setPlanStart(null); setEditStart(false); }} className="btn-ghost flex-1 py-2 text-sm">{t("Reiniciar")}</button>
                )}
              </div>
              <p className="mt-2 text-[10px] text-muted">{t("Las semanas y las fases se ajustan a esta fecha.")}</p>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <>
          <div className="mb-2 mt-4 flex items-center justify-between">
            <span className="text-sm font-medium">{meses[cursor.m]} {cursor.y}</span>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-xs text-muted">{scheduledThisMonth} {t("programados")}</span>
              <button onClick={() => shift(-1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => shift(1)} className="grid h-7 w-7 place-items-center rounded-lg border border-line text-muted">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <p className="mb-2 text-[11px] text-muted">{t("Toca un día para elegir qué entrenas.")}</p>

          <div className="grid grid-cols-7 gap-1 text-center">
            {dow.map((d, i) => (
              <div key={i} className="py-1 text-[10px] font-medium text-muted">{d}</div>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const did = trained.has(key);
              const isToday = key === todayKey;
              const ses = mounted ? sessionOf(schedule[key]) : undefined;

              return (
                <button
                  key={i}
                  onClick={() => setPicker(key)}
                  className={`relative grid aspect-square place-items-center rounded-lg text-xs transition active:scale-95 ${
                    did
                      ? "bg-accent font-semibold text-black"
                      : ses
                      ? "border border-accent bg-accent-soft text-accent"
                      : isToday
                      ? "border border-accent/60 text-accent"
                      : "text-muted hover:border hover:border-line"
                  }`}
                >
                  <span className="leading-none">{day}</span>
                  {ses && !did && (
                    <span className="mt-0.5 text-[8px] font-semibold leading-none">{initials(ses.name)}</span>
                  )}
                  {did && (
                    <Check size={9} className="absolute right-0.5 top-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-accent" /> {t("Entrenado")}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm border border-accent bg-accent-soft" /> {t("Tú lo programas")}</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-accent/60" /> {t("Hoy")}</span>
          </div>
        </>
      )}

      {/* Picker: choose a session for the tapped day */}
      {picker && (
        <div className="mt-3 rounded-xl border border-accent/40 bg-surface-2 p-3 animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">
              {new Date(picker + "T00:00:00").toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <button onClick={() => setPicker(null)} className="text-muted"><X size={16} /></button>
          </div>

          {trained.has(picker) ? (
            <p className="rounded-lg bg-accent-soft p-2 text-[11px] text-accent">
              {t("Ya tienes un entreno registrado este día. ✓")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {plan.sessions.map((s) => {
                  const active = pickerSession === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSchedule(picker, active ? null : s.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active ? "border-accent bg-accent text-black" : "border-line text-ink hover:border-accent/50"
                      }`}
                    >
                      <div className="font-semibold">{t(s.name)}</div>
                      <div className={`text-[10px] ${active ? "text-black/70" : "text-muted"}`}>{t(s.focus)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex gap-2">
                {pickerSession && (
                  <button
                    onClick={() => setSchedule(picker, null)}
                    className="btn-ghost flex-1 justify-center py-2 text-xs"
                  >
                    {t("Quitar / descanso")}
                  </button>
                )}
                {pickerSession && (
                  <Link
                    href={`/entreno/${pickerSession}?date=${picker}`}
                    className="btn-accent flex-1 justify-center gap-1 py-2 text-xs"
                  >
                    <Dumbbell size={13} /> {t("Entrenar")}
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
