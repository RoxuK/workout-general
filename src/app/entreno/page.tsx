"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, CheckCircle2, Plane } from "lucide-react";
import Header from "@/components/Header";
import { useActivePlan } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import { dayName, fmtDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function EntrenoList() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const plan = useActivePlan();
  const t = useT();
  const day = dayName();
  const todayEntry = plan.weeklySplit.find((s) => s.day === day);
  const workouts = useStore((s) => s.workouts);

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Elige tu sesión" title="Entreno" />

      <div className="space-y-3">
        {plan.sessions.filter((s) => !s.travel).map((s) => {
          const isToday = todayEntry?.session.startsWith(s.name);
          const last = mounted ? workouts.find((w) => w.sessionId === s.id) : undefined;
          return (
            <Link
              key={s.id}
              href={`/entreno/${s.id}`}
              className={`block rounded-2xl border p-4 transition ${
                isToday ? "border-accent bg-accent-soft" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl">{t(s.name)}</span>
                    {isToday && <span className="chip border-accent text-accent">{t("Hoy")}</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">{t(s.focus)}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={13} /> {s.exercises.length} {t("ejercicios")}
                    </span>
                    {last && (
                      <span className="inline-flex items-center gap-1 text-good">
                        <CheckCircle2 size={13} /> {t("Última:")} {fmtDate(last.date)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="shrink-0 text-muted" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Travel mode: no gym or hotel mini-gym */}
      <h2 className="section-title mt-8 mb-1 text-xl flex items-center gap-2">
        <Plane size={18} className="text-accent" /> {t("Modo viaje")}
      </h2>
      <p className="mb-3 text-xs text-muted">
        {t("Para cuando no hay gym: habitación, parque u hotel. Cuentan igual para tu racha.")}
      </p>
      <div className="space-y-3">
        {plan.sessions.filter((s) => s.travel).map((s) => {
          const last = mounted ? workouts.find((w) => w.sessionId === s.id) : undefined;
          return (
            <Link
              key={s.id}
              href={`/entreno/${s.id}`}
              className="block rounded-2xl border border-line bg-surface p-4 transition"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl">{t(s.name)}</span>
                    {s.equipment && <span className="chip border-accent/40 text-accent">{t(s.equipment)}</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">{t(s.focus)}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={13} /> {s.exercises.length} {t("ejercicios")}
                    </span>
                    {last && (
                      <span className="inline-flex items-center gap-1 text-good">
                        <CheckCircle2 size={13} /> {t("Última:")} {fmtDate(last.date)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="shrink-0 text-muted" />
              </div>
            </Link>
          );
        })}
      </div>

      <Link href="/progreso" className="btn-ghost mt-6 w-full">
        {t("Ver historial de entrenos")}
      </Link>
    </div>
  );
}
