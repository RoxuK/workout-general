"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, CheckCircle2, Plane } from "lucide-react";
import Header from "@/components/Header";
import { getPlanActivo } from "@/lib/content";
import { useStore } from "@/lib/store";
import { nombreDia, fmtDate } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function EntrenoList() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const plan = getPlanActivo();
  const t = useT();
  const dia = nombreDia();
  const entradaHoy = plan.splitSemanal.find((s) => s.dia === dia);
  const workouts = useStore((s) => s.workouts);

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Elige tu sesión" title="Entreno" />

      <div className="space-y-3">
        {plan.sesiones.filter((s) => !s.viaje).map((s) => {
          const esHoy = entradaHoy?.sesion.startsWith(s.nombre);
          const last = mounted ? workouts.find((w) => w.sesionId === s.id) : undefined;
          return (
            <Link
              key={s.id}
              href={`/entreno/${s.id}`}
              className={`block rounded-2xl border p-4 transition ${
                esHoy ? "border-accent bg-accent-soft" : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl">{t(s.nombre)}</span>
                    {esHoy && <span className="chip border-accent text-accent">{t("Hoy")}</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">{t(s.foco)}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={13} /> {s.ejercicios.length} {t("ejercicios")}
                    </span>
                    {last && (
                      <span className="inline-flex items-center gap-1 text-good">
                        <CheckCircle2 size={13} /> {t("Última:")} {fmtDate(last.fecha)}
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

      {/* Modo viaje: sin gym o con el mini-gym del hotel */}
      <h2 className="section-title mt-8 mb-1 text-xl flex items-center gap-2">
        <Plane size={18} className="text-accent" /> {t("Modo viaje")}
      </h2>
      <p className="mb-3 text-xs text-muted">
        {t("Para cuando no hay gym: habitación, parque u hotel. Cuentan igual para tu racha.")}
      </p>
      <div className="space-y-3">
        {plan.sesiones.filter((s) => s.viaje).map((s) => {
          const last = mounted ? workouts.find((w) => w.sesionId === s.id) : undefined;
          return (
            <Link
              key={s.id}
              href={`/entreno/${s.id}`}
              className="block rounded-2xl border border-line bg-surface p-4 transition"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl">{t(s.nombre)}</span>
                    {s.equipo && <span className="chip border-accent/40 text-accent">{t(s.equipo)}</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">{t(s.foco)}</div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Dumbbell size={13} /> {s.ejercicios.length} {t("ejercicios")}
                    </span>
                    {last && (
                      <span className="inline-flex items-center gap-1 text-good">
                        <CheckCircle2 size={13} /> {t("Última:")} {fmtDate(last.fecha)}
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
