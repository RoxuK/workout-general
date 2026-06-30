"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";
import { useActivePlan } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import { computeAchievements } from "@/lib/achievements";
import { useT } from "@/lib/i18n";

export default function Trophies() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const plan = useActivePlan();
  const workouts = useStore((s) => s.workouts);
  const bodyLogs = useStore((s) => s.bodyLogs);
  const nutricion = useStore((s) => s.nutricion);
  const planStart = useStore((s) => s.planStart);
  const t = useT();

  const list = mounted ? computeAchievements({ workouts, bodyLogs, nutricion }, plan, planStart) : [];
  const unlocked = list.filter((a) => a.unlocked).length;

  // Mostrar primero los conseguidos y luego el más cercano a desbloquear
  const sorted = [...list].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return b.progress - a.progress;
  });

  return (
    <section className="mt-6">
      <Link href="/logros" className="mb-3 flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2 text-xl">
          <Trophy size={18} className="text-accent" /> {t("Logros")}
        </h2>
        <span className="flex items-center gap-1 text-xs text-muted">
          {mounted ? `${unlocked}/${list.length}` : ""} <ChevronRight size={14} />
        </span>
      </Link>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {(mounted ? sorted : Array.from({ length: 5 })).map((a: any, i) => (
          <Link
            key={a?.id ?? i}
            href="/logros"
            className={`flex w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border p-3 text-center transition ${
              a?.unlocked
                ? "border-accent/60 bg-accent-soft"
                : "border-line bg-surface"
            }`}
          >
            <span className={`text-3xl ${a && !a.unlocked ? "opacity-40 grayscale" : ""}`}>
              {a?.emoji ?? "•"}
            </span>
            <span className="text-[11px] leading-tight text-ink">{a ? t(a.titulo) : ""}</span>
            {a && !a.unlocked && (
              <span className="text-[10px] text-muted">
                {a.current}/{a.target}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
