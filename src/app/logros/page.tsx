"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { getPlanActivo } from "@/lib/content";
import { useStore } from "@/lib/store";
import { computeAchievements, CATEGORIAS, type Achievement } from "@/lib/achievements";
import { useT } from "@/lib/i18n";

export default function Logros() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const plan = getPlanActivo();
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutricion = useStore((s) => s.nutricion);
  const planStart = useStore((s) => s.planStart);
  const t = useT();

  const list = mounted ? computeAchievements({ workouts, bodyLogs, nutricion }, plan, planStart) : [];
  const unlocked = list.filter((a) => a.unlocked).length;
  const pct = list.length ? Math.round((unlocked / list.length) * 100) : 0;

  const ordenar = (arr: Achievement[]) =>
    [...arr].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.progress - a.progress;
    });

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Tu motivación" title="Logros" back="/" />

      {/* Resumen global */}
      <div className="card mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-3xl">
              {unlocked}
              <span className="text-muted">/{list.length}</span>
            </div>
            <div className="text-xs text-muted">{t("trofeos desbloqueados")}</div>
          </div>
          <div className="text-5xl">{unlocked >= list.length && list.length > 0 ? "👑" : "🏆"}</div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {CATEGORIAS.map((cat) => {
        const grupo = ordenar(list.filter((a) => a.categoria === cat));
        if (!grupo.length) return null;
        const got = grupo.filter((a) => a.unlocked).length;
        return (
          <section key={cat} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="section-title text-lg">{t(cat)}</h2>
              <span className="text-xs text-muted">
                {got}/{grupo.length}
              </span>
            </div>
            <div className="space-y-3">
              {grupo.map((a) => (
                <div
                  key={a.id}
                  className={`card flex items-center gap-4 ${a.unlocked ? "border-accent/50" : ""}`}
                >
                  <span className={`text-4xl ${a.unlocked ? "" : "opacity-40 grayscale"}`}>{a.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t(a.titulo)}</span>
                      {a.unlocked && <span className="chip border-accent/60 text-accent">{t("Conseguido")}</span>}
                    </div>
                    <p className="text-xs text-muted">{t(a.desc)}</p>
                    {!a.unlocked && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-accent transition-all"
                            style={{ width: `${Math.round(a.progress * 100)}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[10px] text-muted">
                          {a.current} / {a.target}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
