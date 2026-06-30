"use client";

import { useEffect, useState } from "react";
import { Check, ShoppingCart, ChefHat, Clock, Plus, TrendingUp, ChevronDown } from "lucide-react";
import Header from "@/components/Header";
import { useNutritionTargets, useRecipes, useShoppingList } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { NutritionLog } from "@/lib/types";
import { dayKey } from "@/lib/utils";
import ComidaLibreButton from "@/components/ComidaLibre";
import { useT } from "@/lib/i18n";

const blank = (date: string): NutritionLog => ({
  date,
  proteinGoalMet: false,
  ateOut: false,
  hydrationGoalMet: false,
  sleepGoalMet: false,
  craving: false,
  cleanDay: false,
  notes: "",
});

const MOMENT_ORDER = ["Breakfast", "Pre-workout", "Lunch", "Post-workout", "Dinner", "Snack"];

export default function Nutricion() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const today = dayKey();

  const stored = useStore((s) => s.nutrition[today]);
  const setNutritionLog = useStore((s) => s.setNutritionLog);
  const t = useT();
  const nut = useNutritionTargets();
  const log = mounted ? stored ?? blank(today) : blank(today);

  function toggle(k: keyof NutritionLog) {
    setNutritionLog({ ...log, [k]: !log[k] });
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Objetivo diario" title="Nutrición" />

      {/* Macro targets */}
      <div className="card">
        <div className="flex items-end justify-between">
          <div>
            <div className="label">{t("Calorías objetivo")}</div>
            <div className="font-display text-4xl">{nut.kcal}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Macro label={t("Proteína")} g={nut.protein} color="var(--good)" />
          <Macro label={t("Carbos")} g={nut.carbs} color="var(--accent)" />
          <Macro label={t("Grasa")} g={nut.fats} color="var(--warn)" />
        </div>
        {nut.note && <p className="mt-3 text-[11px] text-muted">{t(nut.note)}</p>}
      </div>

      {/* Today's macro tracker */}
      {mounted && <MacroTracker />}

      {/* Today's check */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Check de hoy")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Toggle on={log.proteinGoalMet} onClick={() => toggle("proteinGoalMet")} label={t("Proteína OK")} />
        <Toggle on={log.hydrationGoalMet} onClick={() => toggle("hydrationGoalMet")} label={t("3 L agua")} />
        <Toggle on={log.sleepGoalMet} onClick={() => toggle("sleepGoalMet")} label={t("7–8 h sueño")} />
        <Toggle on={log.ateOut} onClick={() => toggle("ateOut")} label={t("Comí fuera")} neutral />
        <Toggle on={log.craving} onClick={() => toggle("craving")} label={t("Antojo / atracón")} warn />
        <Toggle on={log.cleanDay} onClick={() => toggle("cleanDay")} label={t("Día limpio ✓")} />
      </div>

      {/* Recipe book */}
      <Recetario />

      {/* Shopping list */}
      <ShoppingListSection />
    </div>
  );
}

// ─── MacroTracker ────────────────────────────────────────────────────────────────

function MacroTracker() {
  const today = dayKey();
  const t = useT();
  const nut = useNutritionTargets();
  const recipes = useRecipes();
  const recipesEatenIds = useStore((s) => s.recipesEaten[today]) ?? [];
  const toggleRecipeEaten = useStore((s) => s.toggleRecipeEaten);
  const freeMealsRaw = useStore((s) => s.freeMeals[today]);
  const freeMealsToday = freeMealsRaw ?? [];
  const removeFreeMeal = useStore((s) => s.removeFreeMeal);

  const eatenRecipes = recipes.filter((r) => recipesEatenIds.includes(r.id));
  const totals = [
    ...eatenRecipes.map((r) => ({ kcal: r.kcal, p: r.protein, c: r.carbs, g: r.fats })),
    ...freeMealsToday.map((x) => ({ kcal: x.kcal, p: x.p, c: x.c, g: x.g })),
  ].reduce(
    (acc, x) => ({ kcal: acc.kcal + x.kcal, p: acc.p + x.p, c: acc.c + x.c, g: acc.g + x.g }),
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
  const logged = eatenRecipes.length + freeMealsToday.length;

  return (
    <div className="mt-4 card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" />
          <span className="label">{t("Consumido hoy")}</span>
        </div>
        {logged > 0 && (
          <span className="text-[11px] text-muted">
            {Math.round(totals.kcal)} {t("kcal totales")}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <MacroBar label={t("Calorías")} val={totals.kcal} max={nut.kcal} unit="kcal" color="var(--accent)" />
        <MacroBar label={t("Proteína")} val={totals.p} max={nut.protein} unit="g" color="var(--good)" />
        <MacroBar label={t("Carbos")} val={totals.c} max={nut.carbs} unit="g" color="var(--accent)" />
        <MacroBar label={t("Grasa")} val={totals.g} max={nut.fats} unit="g" color="var(--warn)" />
      </div>

      {logged === 0 ? (
        <p className="mt-3 text-center text-[11px] text-muted">
          {t("Marca recetas o añade lo que vayas comiendo con el botón de abajo ↓")}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-line pt-3">
          {eatenRecipes.map((r) => (
            <button
              key={r.id}
              onClick={() => toggleRecipeEaten(today, r.id)}
              className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-[10px] text-accent transition hover:border-bad/50 hover:bg-bad/10 hover:text-bad"
              title="Quitar"
            >
              {t(r.name).split(" ").slice(0, 4).join(" ")} ×
            </button>
          ))}
          {freeMealsToday.map((x) => (
            <button
              key={x.id}
              onClick={() => removeFreeMeal(today, x.id)}
              className="flex items-center gap-1 rounded-full border border-warn/40 bg-warn/5 px-2 py-0.5 text-[10px] text-warn transition hover:border-bad/50 hover:bg-bad/10 hover:text-bad"
              title="Quitar"
            >
              {x.name.split(" ").slice(0, 4).join(" ")} · {x.kcal} kcal ×
            </button>
          ))}
        </div>
      )}

      <ComidaLibreButton />
    </div>
  );
}

function MacroBar({
  label, val, max, unit, color,
}: {
  label: string; val: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  const over = val > max * 1.05; // 5% tolerance
  const barColor = over ? "var(--bad)" : color;
  const textColor = over ? "var(--bad)" : pct >= 80 ? color : "var(--muted)";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] tabular-nums" style={{ color: textColor }}>
          {Math.round(val)} / {max} {unit}
          {pct >= 95 && !over && " ✓"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

// ─── Recipe book ───────────────────────────────────────────────────────────────────

function Recetario() {
  const recipes = useRecipes();
  const t = useT();
  const today = dayKey();
  const eatenIds = useStore((s) => s.recipesEaten[today]) ?? [];
  const toggleRecipeEaten = useStore((s) => s.toggleRecipeEaten);

  const moments = Array.from(new Set(recipes.map((r) => r.moment)))
    .sort((a, b) => {
      const ia = MOMENT_ORDER.indexOf(a);
      const ib = MOMENT_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  const [moment, setMoment] = useState<string>(moments[0] ?? "");

  if (!recipes.length) return null;
  const activeMoment = moments.includes(moment) ? moment : moments[0];
  const filtered = recipes.filter((r) => r.moment === activeMoment);

  return (
    <>
      <h2 className="section-title mt-7 mb-1 text-xl flex items-center gap-2">
        <ChefHat size={18} className="text-accent" /> {t("Recetario")}
      </h2>
      <p className="mb-3 text-xs text-muted">{t("Tu recetario, generado con tu plan. Pulsa + para registrar lo que comes.")}</p>

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pt-2 pb-1">
        {moments.map((m) => {
          const eatenInMoment = recipes.filter((r) => r.moment === m && eatenIds.includes(r.id)).length;
          return (
            <button
              key={m}
              onClick={() => setMoment(m)}
              className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                m === activeMoment ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
              }`}
            >
              {t(m)}
              {eatenInMoment > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] text-black font-bold">
                  {eatenInMoment}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((r) => (
          <RecetaCard
            key={r.id}
            receta={r}
            selected={eatenIds.includes(r.id)}
            onToggle={() => toggleRecipeEaten(today, r.id)}
          />
        ))}
      </div>
    </>
  );
}

function RecetaCard({
  receta: r,
  selected,
  onToggle,
}: {
  receta: ReturnType<typeof useRecipes>[number];
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        selected ? "border-accent/50 bg-accent/[0.06]" : "border-line bg-surface-2"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpen((o) => !o)}>
          <div className="font-medium leading-snug">{t(r.name)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>{r.kcal} kcal · {r.protein}P/{r.carbs}C/{r.fats}G</span>
            <span className="chip gap-1"><Clock size={11} /> {r.time}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`grid h-8 w-8 place-items-center rounded-full border transition active:scale-95 ${
              selected
                ? "border-accent bg-accent text-black"
                : "border-line text-muted hover:border-accent/60 hover:text-accent"
            }`}
            title={selected ? t("Quitar de hoy") : t("Añadir a hoy")}
          >
            {selected ? <Check size={14} /> : <Plus size={14} />}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-8 w-6 place-items-center text-muted"
            title={t("Ver receta")}
          >
            <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 animate-fade-up">
          <div>
            <div className="label mb-1">{t("Ingredientes")}</div>
            <ul className="space-y-1 text-sm text-muted">
              {r.ingredients.map((it, j) => (
                <li key={j} className="flex gap-2"><span className="text-accent">•</span>{t(it)}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-1">{t("Preparación")}</div>
            <ol className="space-y-1 text-sm text-muted">
              {r.steps.map((p, j) => (
                <li key={j} className="flex gap-2"><span className="text-accent">{j + 1}.</span>{t(p)}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shopping list ───────────────────────────────────────────────────────────────

function ShoppingListSection() {
  const list = useShoppingList();
  const t = useT();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  if (!list.length) return null;

  return (
    <>
      <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
        <ShoppingCart size={18} className="text-accent" /> {t("Lista de la compra")}
      </h2>
      <div className="space-y-4">
        {list.map((cat, i) => (
          <div key={i} className="card-2">
            <div className="mb-2 font-medium text-accent">{t(cat.category)}</div>
            <div className="space-y-1.5">
              {cat.items.map((it, j) => {
                const key = `${i}-${j}`;
                const on = checked[key];
                return (
                  <button
                    key={j}
                    onClick={() => setChecked((c) => ({ ...c, [key]: !c[key] }))}
                    className="flex w-full items-center gap-2 text-left text-sm"
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-accent bg-accent text-black" : "border-line"}`}>
                      {on && <Check size={11} />}
                    </span>
                    <span className={on ? "text-muted line-through" : "text-ink"}>{t(it)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── UI helpers ────────────────────────────────────────────────────────────────────

function Macro({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <div className="card-2 py-3 text-center">
      <div className="font-display text-2xl" style={{ color }}>{g}<span className="text-sm">g</span></div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Toggle({
  on, onClick, label, warn, neutral,
}: {
  on: boolean; onClick: () => void; label: string; warn?: boolean; neutral?: boolean;
}) {
  const active = on
    ? warn
      ? "border-bad/60 bg-bad/10 text-bad"
      : neutral
      ? "border-line bg-surface-2 text-ink"
      : "border-good/60 bg-good/10 text-good"
    : "border-line bg-surface text-muted";
  return (
    <button onClick={onClick} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition active:scale-[0.98] ${active}`}>
      {label}
      <span className={`grid h-5 w-5 place-items-center rounded-full border ${on ? "border-current" : "border-line"}`}>
        {on && <Check size={13} />}
      </span>
    </button>
  );
}
