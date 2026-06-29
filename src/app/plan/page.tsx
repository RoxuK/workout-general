"use client";

import Link from "next/link";
import { ChevronRight, AlertTriangle, Flame } from "lucide-react";
import Header from "@/components/Header";
import { getPlanActivo } from "@/lib/content";
import { useT } from "@/lib/i18n";

export default function PlanPage() {
  const plan = getPlanActivo();
  const t = useT();
  return (
    <div className="animate-fade-up">
      <Header eyebrow="Bloque actual" title="Tu plan" />

      <div className="card">
        <div className="font-display text-xl">{t(plan.nombre)}</div>
        <p className="mt-1 text-sm text-muted">{t(plan.resumen)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="chip">{t(plan.estructura)}</span>
          <span className="chip">{t(plan.frecuencia)}</span>
          <span className="chip">{plan.pesoInicial} → {plan.pesoObjetivo} kg</span>
        </div>
      </div>

      {/* Fases */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Fases")}</h2>
      <div className="space-y-2">
        {plan.fases.map((f, i) => (
          <div key={i} className="card-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{t(f.nombre)}</div>
              <span className="chip">{t("Sem")} {f.semanas}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{t(f.objetivo)}</p>
            <p className="mt-1 text-xs text-accent">{t(f.rpe)}</p>
          </div>
        ))}
      </div>

      {/* Split semanal */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Semana tipo")}</h2>
      <div className="card divide-y divide-line p-0">
        {plan.splitSemanal.map((s, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted">{t(s.dia)}</span>
            <span className="text-sm">{t(s.sesion)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t(plan.notaSplit)}</p>

      {/* Sesiones */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Sesiones")}</h2>
      <div className="space-y-2">
        {plan.sesiones.map((s) => (
          <Link key={s.id} href={`/entreno/${s.id}`} className="card-2 flex items-center justify-between">
            <div>
              <div className="font-display text-lg">{t(s.nombre)}</div>
              <div className="text-xs text-muted">{t(s.foco)} · {s.ejercicios.length} {t("ejercicios")}</div>
            </div>
            <ChevronRight className="text-muted" size={20} />
          </Link>
        ))}
      </div>

      {/* Calentamiento */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Calentamiento")}</h2>
      <div className="card">
        <div className="mb-2 flex items-center gap-2 text-sm text-accent">
          <Flame size={16} /> {plan.calentamiento.duracion} · {t("obligatorio")}
        </div>
        <ol className="space-y-2">
          {plan.calentamiento.pasos.map((p, i) => (
            <li key={i} className="text-sm">
              <span className="text-ink">{t(p.ejercicio)}</span>{" "}
              <span className="text-muted">— {t(p.detalle)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-xl bg-accent-soft p-3 text-xs text-muted">{t(plan.calentamiento.nota)}</p>
      </div>

      {/* Progresiones */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Cómo progresa")}</h2>
      <div className="space-y-2">
        {plan.progresiones.map((p, i) => (
          <div key={i} className="card-2">
            <div className="font-medium text-accent">{t(p.fase)}</div>
            <ul className="mt-2 space-y-1.5">
              {p.puntos.map((pt, j) => (
                <li key={j} className="flex gap-2 text-sm text-muted">
                  <span className="text-accent">•</span> {t(pt)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Regla lumbar */}
      <div className="mt-5 rounded-2xl border border-bad/40 bg-bad/10 p-4">
        <div className="mb-1 flex items-center gap-2 font-medium text-bad">
          <AlertTriangle size={16} /> {t("Regla de la lumbar")}
        </div>
        <p className="text-sm text-muted">{t(plan.reglaLumbar)}</p>
      </div>
    </div>
  );
}
