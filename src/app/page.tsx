"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings, FileText, ArrowRight, Activity, Flame, Scale, ShieldCheck } from "lucide-react";
import { pesoInicialEfectivo, ultimoPeso } from "@/lib/content";
import { useActivePlan, useNutritionTargets, useUserName } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import { nombreDia, dayKey } from "@/lib/utils";
import { useT, useLang } from "@/lib/i18n";
import Ring from "@/components/Ring";
import TrainingCalendar from "@/components/TrainingCalendar";
import Trophies from "@/components/Trophies";
import WeeklySummary from "@/components/WeeklySummary";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const plan = useActivePlan();
  const nutrition = useNutritionTargets();
  const userName = useUserName();
  const t = useT();
  const lang = useLang();
  const hoy = new Date();
  const dia = nombreDia(hoy);
  const hoyKey = dayKey(hoy);

  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutricion = useStore((s) => s.nutricion);
  const agendaHoy = useStore((s) => s.agenda[hoyKey]);
  const planStart = useStore((s) => s.planStart);

  // La sesión de hoy la decide Roxu (agenda). Si no ha elegido nada,
  // se sugiere la del split semanal como ayuda.
  const entradaHoy = plan.splitSemanal.find((s) => s.dia === dia);
  const sesionAgenda = mounted ? plan.sesiones.find((s) => s.id === agendaHoy) : undefined;
  const sesionSugerida = plan.sesiones.find((s) => entradaHoy?.sesion.startsWith(s.nombre));
  const sesionHoy = sesionAgenda ?? sesionSugerida;
  const esElegida = !!sesionAgenda;

  // El punto de partida lo marca el primer pesaje real (báscula o manual),
  // no el número fijo del plan.
  const pesoBase = mounted ? pesoInicialEfectivo(plan, bodyLogs, planStart) : plan.pesoInicial;
  const pesoActual = mounted ? ultimoPeso(bodyLogs) ?? pesoBase : plan.pesoInicial;
  const totalAPerder = pesoBase - plan.pesoObjetivo;
  const perdido = pesoBase - pesoActual;
  const progreso = totalAPerder > 0 ? perdido / totalAPerder : 0;

  const inicioSemana = startOfWeek(hoy);
  const entrenosSemana = mounted
    ? workouts.filter((w) => new Date(w.fecha) >= inicioSemana).length
    : 0;
  const diasLimpiosSemana = mounted
    ? Object.values(nutricion).filter(
        (n) => n.diaLimpio && new Date(n.fecha) >= inicioSemana
      ).length
    : 0;
  const ultLumbar = mounted ? workouts.find((w) => w.lumbar != null)?.lumbar ?? null : null;

  return (
    <div className="animate-fade-up">
      <header className="flex items-center justify-between pt-3">
        <div>
          {/* suppress: la fecha se prerenderiza en el build y cambia al hidratar */}
          <div className="label" suppressHydrationWarning>
            {hoy.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="mt-0.5 font-display text-3xl">
            {t("Hola,")} <span className="text-accent-grad">{mounted ? userName : ""}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/reportes" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted">
            <FileText size={18} />
          </Link>
          <Link href="/ajustes" className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted">
            <Settings size={18} />
          </Link>
        </div>
      </header>

      {/* Sesión de hoy */}
      <section className="mt-6">
        {sesionHoy ? (
          <Link
            href={`/entreno/${sesionHoy.id}`}
            className="block overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface p-5"
          >
            <div className="label">{esElegida ? t("Tu sesión de hoy") : t("Sugerencia de hoy")}</div>
            <div className="mt-1 flex items-end justify-between">
              <div>
                <div className="font-display text-3xl">{t(sesionHoy.nombre)}</div>
                <div className="mt-1 text-sm text-muted">{t(sesionHoy.foco)}</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-black">
                <ArrowRight size={22} />
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-xs text-muted">
              <span className="chip">{sesionHoy.ejercicios.length} {t("ejercicios")}</span>
              <span className="chip">{t("+ calentamiento 10 min")}</span>
            </div>
          </Link>
        ) : (
          <div className="card">
            <div className="label">{t("Hoy toca")}</div>
            <div className="mt-1 font-display text-2xl">{entradaHoy?.sesion ? t(entradaHoy.sesion) : t("Descanso")}</div>
            <p className="mt-1 text-sm text-muted">
              {t("Día de recuperación. Si quieres, elige una sesión y entrena igual.")}
            </p>
            <Link href="/entreno" className="btn-ghost mt-3 w-full">{t("Ver sesiones")}</Link>
          </div>
        )}
      </section>

      {/* Progreso de peso */}
      <section className="mt-4 card flex items-center gap-4">
        <Ring
          value={progreso}
          label={`${pesoActual.toFixed(1)}`}
          sub={`kg · ${t("meta")} ${plan.pesoObjetivo}`}
        />
        <div className="flex-1">
          <div className="label">{t("Recomposición")}</div>
          <div className="mt-1 font-display text-2xl">
            {perdido > 0 ? `−${perdido.toFixed(1)} kg` : t("Arrancando")}
          </div>
          <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
            {Math.round(progreso * 100)}% {t("del objetivo")} ({pesoBase} → {plan.pesoObjetivo} kg)
          </p>
          <Link href="/progreso" className="mt-3 inline-flex items-center gap-1 text-xs text-accent">
            <Scale size={14} /> {t("Registrar pesaje")}
          </Link>
        </div>
      </section>

      {/* Métricas rápidas */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={<Flame size={16} />} value={`${entrenosSemana}/4`} label={t("Entrenos sem.")} />
        <Stat icon={<ShieldCheck size={16} />} value={`${diasLimpiosSemana}`} label={t("Días limpios")} />
        <Stat
          icon={<Activity size={16} />}
          value={ultLumbar ? `${ultLumbar}/5` : "—"}
          label={t("Lumbar")}
          tone={ultLumbar != null && ultLumbar <= 2 ? "bad" : "default"}
        />
      </section>

      {/* Resumen de la semana vs la anterior */}
      <WeeklySummary />

      {/* Calendario de entrenos */}
      <TrainingCalendar />

      {/* Logros / gamificación */}
      <Trophies />

      {/* Accesos */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/nutricion" className="card-2 text-center">
          <div className="font-display text-xl">{t("Nutrición")}</div>
          <div className="mt-0.5 text-xs text-muted">{nutrition.kcal} {t("kcal objetivo")}</div>
        </Link>
        <Link href="/plan" className="card-2 text-center">
          <div className="font-display text-xl">{t("Plan")}</div>
          <div className="mt-0.5 text-xs text-muted">{plan.fases.length} {t("fases · 12 sem")}</div>
        </Link>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted">
        {t(plan.nombre)}
      </p>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "default" | "bad";
}) {
  return (
    <div className="card-2 flex flex-col items-center gap-1 py-3 text-center">
      <span className={tone === "bad" ? "text-bad" : "text-accent"}>{icon}</span>
      <span className="font-display text-xl">{value}</span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
