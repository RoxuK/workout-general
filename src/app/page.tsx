"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Settings, FileText, ArrowRight, Activity, Flame, Scale, ShieldCheck } from "lucide-react";
import { effectiveStartingWeight, latestWeight } from "@/lib/content";
import { useActivePlan, useNutritionTargets, useUserName } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import { dayName, dayKey } from "@/lib/utils";
import { useT, useLang } from "@/lib/i18n";
import { shouldAutoResume } from "@/lib/resume-guard";
import Ring from "@/components/Ring";
import TrainingCalendar from "@/components/TrainingCalendar";
import Trophies from "@/components/Trophies";
import WeeklySummary from "@/components/WeeklySummary";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const router = useRouter();

  // If the app reopens with a workout in progress (the phone unloaded the
  // tab mid-set), jump straight back to that session instead of leaving the
  // user on the dashboard.
  useEffect(() => {
    if (!mounted || !shouldAutoResume()) return;
    const draft = useStore.getState().workoutDraft;
    if (draft) router.replace(`/entreno/${draft.sessionId}`);
  }, [mounted]); // eslint-disable-line

  const plan = useActivePlan();
  const nutrition = useNutritionTargets();
  const userName = useUserName();
  const t = useT();
  const lang = useLang();
  const today = new Date();
  const day = dayName(today);
  const todayKey = dayKey(today);

  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutritionLogs = useStore((s) => s.nutrition);
  const scheduledToday = useStore((s) => s.schedule[todayKey]);
  const planStart = useStore((s) => s.planStart);

  // Today's session is the user's call (schedule). If nothing's chosen yet,
  // suggest the one from the weekly split as a hint.
  const todayEntry = plan.weeklySplit.find((s) => s.day === day);
  const scheduledSession = mounted ? plan.sessions.find((s) => s.id === scheduledToday) : undefined;
  const suggestedSession = plan.sessions.find((s) => todayEntry?.session.startsWith(s.name));
  const sessionToday = scheduledSession ?? suggestedSession;
  const isChosen = !!scheduledSession;

  // The real starting point is the first actual weigh-in (manual), not the
  // plan's fixed number.
  const baseWeight = mounted ? effectiveStartingWeight(plan, bodyLogs, planStart) : plan.startingWeight;
  const currentWeight = mounted ? latestWeight(bodyLogs) ?? baseWeight : plan.startingWeight;
  const totalToLose = baseWeight - plan.targetWeight;
  const lost = baseWeight - currentWeight;
  const progress = totalToLose > 0 ? lost / totalToLose : 0;

  const weekStart = startOfWeek(today);
  const workoutsThisWeek = mounted
    ? workouts.filter((w) => new Date(w.date) >= weekStart).length
    : 0;
  const cleanDaysThisWeek = mounted
    ? Object.values(nutritionLogs).filter(
        (n) => n.cleanDay && new Date(n.date) >= weekStart
      ).length
    : 0;
  const lastSoreness = mounted ? workouts.find((w) => w.soreness != null)?.soreness ?? null : null;

  return (
    <div className="animate-fade-up">
      <header className="flex items-center justify-between pt-3">
        <div>
          {/* suppress: the date is pre-rendered at build time and changes on hydrate */}
          <div className="label" suppressHydrationWarning>
            {today.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long" })}
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

      {/* Today's session */}
      <section className="mt-6">
        {sessionToday ? (
          <Link
            href={`/entreno/${sessionToday.id}`}
            className="block overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface-2 to-surface p-5"
          >
            <div className="label">{isChosen ? t("Tu sesión de hoy") : t("Sugerencia de hoy")}</div>
            <div className="mt-1 flex items-end justify-between">
              <div>
                <div className="font-display text-3xl">{t(sessionToday.name)}</div>
                <div className="mt-1 text-sm text-muted">{t(sessionToday.focus)}</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent text-black">
                <ArrowRight size={22} />
              </div>
            </div>
            <div className="mt-4 flex gap-2 text-xs text-muted">
              <span className="chip">{sessionToday.exercises.length} {t("ejercicios")}</span>
              <span className="chip">{t("+ calentamiento 10 min")}</span>
            </div>
          </Link>
        ) : (
          <div className="card">
            <div className="label">{t("Hoy toca")}</div>
            <div className="mt-1 font-display text-2xl">{todayEntry?.session ? t(todayEntry.session) : t("Descanso")}</div>
            <p className="mt-1 text-sm text-muted">
              {t("Día de recuperación. Si quieres, elige una sesión y entrena igual.")}
            </p>
            <Link href="/entreno" className="btn-ghost mt-3 w-full">{t("Ver sesiones")}</Link>
          </div>
        )}
      </section>

      {/* Weight progress */}
      <section className="mt-4 card flex items-center gap-4">
        <Ring
          value={progress}
          label={`${currentWeight.toFixed(1)}`}
          sub={`kg · ${t("meta")} ${plan.targetWeight}`}
        />
        <div className="flex-1">
          <div className="label">{t("Recomposición")}</div>
          <div className="mt-1 font-display text-2xl">
            {lost > 0 ? `−${lost.toFixed(1)} kg` : t("Arrancando")}
          </div>
          <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
            {Math.round(progress * 100)}% {t("del objetivo")} ({baseWeight} → {plan.targetWeight} kg)
          </p>
          <Link href="/progreso" className="mt-3 inline-flex items-center gap-1 text-xs text-accent">
            <Scale size={14} /> {t("Registrar pesaje")}
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={<Flame size={16} />} value={`${workoutsThisWeek}/4`} label={t("Entrenos sem.")} />
        <Stat icon={<ShieldCheck size={16} />} value={`${cleanDaysThisWeek}`} label={t("Días limpios")} />
        <Stat
          icon={<Activity size={16} />}
          value={lastSoreness ? `${lastSoreness}/5` : "—"}
          label={t("Recuperación")}
          tone={lastSoreness != null && lastSoreness <= 2 ? "bad" : "default"}
        />
      </section>

      {/* This week vs last week */}
      <WeeklySummary />

      {/* Training calendar */}
      <TrainingCalendar />

      {/* Achievements / gamification */}
      <Trophies />

      {/* Quick links */}
      <section className="mt-6 grid grid-cols-2 gap-3">
        <Link href="/nutricion" className="card-2 text-center">
          <div className="font-display text-xl">{t("Nutrición")}</div>
          <div className="mt-0.5 text-xs text-muted">{nutrition.kcal} {t("kcal objetivo")}</div>
        </Link>
        <Link href="/plan" className="card-2 text-center">
          <div className="font-display text-xl">{t("Plan")}</div>
          <div className="mt-0.5 text-xs text-muted">{plan.phases.length} {t("fases · 12 sem")}</div>
        </Link>
      </section>

      <p className="mt-6 text-center text-[11px] text-muted">
        {t(plan.name)}
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
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
