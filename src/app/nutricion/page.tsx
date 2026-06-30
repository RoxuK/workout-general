"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check, MapPin, ShoppingCart, Utensils, ChefHat,
  Clock, Pill, Bell, Plus, TrendingUp, ChevronDown,
} from "lucide-react";
import Header from "@/components/Header";
import {
  NUTRICION, SHOPPING, COMER_FUERA, RECETAS,
  SUPLEMENTACION, faseActual,
} from "@/lib/content";
import { useActivePlan, useNutritionTargets } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { NutricionLog } from "@/lib/types";
import { dayKey } from "@/lib/utils";
import ComidaLibreButton from "@/components/ComidaLibre";
import { useT } from "@/lib/i18n";

// "36P / 52C / 10G" → { p:36, c:52, g:10 }
function parseMacros(s: string): { p: number; c: number; g: number } {
  const m = s.match(/(\d+)P[^0-9]*(\d+)C[^0-9]*(\d+)G/);
  return m ? { p: +m[1], c: +m[2], g: +m[3] } : { p: 0, c: 0, g: 0 };
}

const blank = (fecha: string): NutricionLog => ({
  fecha,
  proteinaOk: false,
  comioFuera: false,
  hidratacionOk: false,
  suenoOk: false,
  antojo: false,
  diaLimpio: false,
  notas: "",
});

export default function Nutricion() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const hoy = dayKey();

  const stored = useStore((s) => s.nutricion[hoy]);
  const setNutricion = useStore((s) => s.setNutricion);
  const t = useT();
  const nut = useNutritionTargets();
  const log = mounted ? stored ?? blank(hoy) : blank(hoy);

  function toggle(k: keyof NutricionLog) {
    setNutricion({ ...log, [k]: !log[k] });
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Objetivo diario" title="Nutrición" />

      {/* Macros objetivo */}
      <div className="card">
        <div className="flex items-end justify-between">
          <div>
            <div className="label">{t("Calorías objetivo")}</div>
            <div className="font-display text-4xl">{nut.kcal}</div>
          </div>
          <div className="text-right text-xs text-muted">
            {(NUTRICION as any).deficit && <div>{t("Déficit")} {(NUTRICION as any).deficit}</div>}
            {(NUTRICION as any).perdidaEsperada && <div>{(NUTRICION as any).perdidaEsperada}</div>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Macro label={t("Proteína")} g={nut.proteina} color="var(--good)" />
          <Macro label={t("Carbos")} g={nut.carbos} color="var(--accent)" />
          <Macro label={t("Grasa")} g={nut.grasas ?? (NUTRICION as any).grasa} color="var(--warn)" />
        </div>
        {nut.nota
          ? <p className="mt-3 text-[11px] text-muted">{t(nut.nota)}</p>
          : (NUTRICION as any).notaProteina && <p className="mt-3 text-[11px] text-muted">{t((NUTRICION as any).notaProteina)}</p>
        }
      </div>

      {/* Tracker de macros del día */}
      {mounted && <MacroTracker />}

      {/* Check de hoy */}
      <h2 className="section-title mt-7 mb-3 text-xl">{t("Check de hoy")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Toggle on={log.proteinaOk} onClick={() => toggle("proteinaOk")} label={t("Proteína OK")} />
        <Toggle on={log.hidratacionOk} onClick={() => toggle("hidratacionOk")} label={t("3 L agua")} />
        <Toggle on={log.suenoOk} onClick={() => toggle("suenoOk")} label={t("7–8 h sueño")} />
        <Toggle on={log.comioFuera} onClick={() => toggle("comioFuera")} label={t("Comí fuera")} neutral />
        <Toggle on={log.antojo} onClick={() => toggle("antojo")} label={t("Antojo / atracón")} warn />
        <Toggle on={log.diaLimpio} onClick={() => toggle("diaLimpio")} label={t("Día limpio ✓")} />
      </div>

      {/* Si hoy come fuera: chuleta rápida a mano */}
      {mounted && log.comioFuera && (
        <div className="mt-3 card border-accent/30 animate-fade-up">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-accent">
            <MapPin size={15} /> {t("¿Comes fuera hoy? Juega con ventaja")}
          </div>
          <ul className="space-y-1.5 text-xs text-muted">
            {COMER_FUERA.reglas.slice(0, 3).map((r: any, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-accent">{i + 1}.</span>
                <span><span className="text-ink">{t(r.regla)}.</span> {t(r.detalle)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1 border-t border-line pt-2">
            {COMER_FUERA.opciones.slice(0, 4).map((o: any, i: number) => (
              <div key={i} className="text-[11px]">
                <span className="text-ink">{t(o.sitio)}:</span>{" "}
                <span className="text-muted">{t(o.tip)}</span>
              </div>
            ))}
          </div>
          <a href="#comer-fuera" className="mt-2 inline-block text-xs text-accent">
            {t("Ver la chuleta completa ↓")}
          </a>
        </div>
      )}

      {/* Recetario */}
      <Recetas />

      {/* Suplementación */}
      <Suplementacion />

      {/* Plantillas de comida */}
      <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
        <Utensils size={18} className="text-accent" /> {t("Plantilla del día")}
      </h2>
      <div className="space-y-2">
        {NUTRICION.comidas.map((c, i) => (
          <details key={i} className="card-2 group">
            <summary className="flex cursor-pointer items-center justify-between list-none">
              <span className="font-medium">{t(c.nombre)}</span>
              <span className="text-xs text-muted">{c.kcal} kcal · {c.macros}</span>
            </summary>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {c.items.map((it, j) => (
                <li key={j} className="flex gap-2"><span className="text-accent">•</span>{t(it)}</li>
              ))}
              {"nota" in c && c.nota && <li className="text-xs text-accent">{t(c.nota)}</li>}
            </ul>
          </details>
        ))}
      </div>

      {/* Comer fuera */}
      <h2 id="comer-fuera" className="section-title mt-7 mb-3 text-xl flex items-center gap-2 scroll-mt-4">
        <MapPin size={18} className="text-accent" /> {t(COMER_FUERA.titulo)}
      </h2>
      <div className="card">
        <p className="mb-3 text-xs text-muted">{t(COMER_FUERA.subtitulo)}</p>
        <ol className="space-y-2">
          {COMER_FUERA.reglas.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs text-accent">{i + 1}</span>
              <span><span className="text-ink">{t(r.regla)}.</span> <span className="text-muted">{t(r.detalle)}</span></span>
            </li>
          ))}
        </ol>
        <div className="mt-3 space-y-1 border-t border-line pt-3">
          {COMER_FUERA.opciones.map((o, i) => (
            <div key={i} className="text-xs"><span className="text-ink">{t(o.sitio)}:</span> <span className="text-muted">{t(o.tip)}</span></div>
          ))}
        </div>
      </div>

      {/* Lista de la compra */}
      <Shopping />
    </div>
  );
}

// ─── MacroTracker ─────────────────────────────────────────────────────────────────

function MacroTracker() {
  const hoy = dayKey();
  const t = useT();
  const nut = useNutritionTargets();
  const comidasRaw = useStore((s) => s.comidasDia[hoy]);
  const comidasHoy = comidasRaw ?? [];
  const toggleReceta = useStore((s) => s.toggleRecetaDia);
  const libresRaw = useStore((s) => s.comidasLibres[hoy]);
  const libresHoy = libresRaw ?? [];
  const removeComidaLibre = useStore((s) => s.removeComidaLibre);

  const allRecipes = RECETAS.recetas as any[];
  const seleccionadas = allRecipes.filter((r) => comidasHoy.includes(r.id));

  const deRecetas = seleccionadas.reduce(
    (acc, r) => {
      const m = parseMacros(r.macros);
      return { kcal: acc.kcal + r.kcal, p: acc.p + m.p, c: acc.c + m.c, g: acc.g + m.g };
    },
    { kcal: 0, p: 0, c: 0, g: 0 }
  );
  const totals = libresHoy.reduce(
    (acc, x) => ({ kcal: acc.kcal + x.kcal, p: acc.p + x.p, c: acc.c + x.c, g: acc.g + x.g }),
    deRecetas
  );
  const nRegistros = seleccionadas.length + libresHoy.length;

  // Agrupar por momento para el resumen
  const porMomento: Record<string, any[]> = {};
  for (const r of seleccionadas) {
    (porMomento[r.momento] ||= []).push(r);
  }
  const ordenMomentos = ["Desayuno", "Pre-entreno", "Comida", "Post-entreno", "Cena", "Snack"];
  const momentosConDatos = ordenMomentos.filter((m) => porMomento[m]?.length);

  return (
    <div className="mt-4 card">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-accent" />
          <span className="label">{t("Consumido hoy")}</span>
        </div>
        {nRegistros > 0 && (
          <span className="text-[11px] text-muted">
            {Math.round(totals.kcal)} {t("kcal totales")}
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <MacroBar label={t("Calorías")} val={totals.kcal} max={nut.kcal} unit="kcal" color="var(--accent)" />
        <MacroBar label={t("Proteína")} val={totals.p} max={nut.proteina} unit="g" color="var(--good)" />
        <MacroBar label={t("Carbos")} val={totals.c} max={nut.carbos} unit="g" color="var(--accent)" />
        <MacroBar label={t("Grasa")} val={totals.g} max={nut.grasas ?? (NUTRICION as any).grasa} unit="g" color="var(--warn)" />
      </div>

      {nRegistros === 0 ? (
        <p className="mt-3 text-center text-[11px] text-muted">
          {t("Pulsa")} <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted text-[10px]">+</span> {t("en las recetas que vayas comiendo ↓")}
        </p>
      ) : (
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          {momentosConDatos.map((mom) => (
            <div key={mom} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 w-20 text-[11px] text-muted">{t(mom)}</span>
              <div className="flex flex-wrap gap-1">
                {porMomento[mom].map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => toggleReceta(hoy, r.id)}
                    className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-[10px] text-accent transition hover:border-bad/50 hover:bg-bad/10 hover:text-bad"
                    title="Quitar"
                  >
                    {t(r.nombre).split(" ").slice(0, 4).join(" ")} ×
                  </button>
                ))}
              </div>
            </div>
          ))}
          {libresHoy.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 w-20 text-[11px] text-muted">{t("Libre")}</span>
              <div className="flex flex-wrap gap-1">
                {libresHoy.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => removeComidaLibre(hoy, x.id)}
                    className="flex items-center gap-1 rounded-full border border-warn/40 bg-warn/5 px-2 py-0.5 text-[10px] text-warn transition hover:border-bad/50 hover:bg-bad/10 hover:text-bad"
                    title="Quitar"
                  >
                    {x.nombre.split(" ").slice(0, 4).join(" ")} · {x.kcal} kcal ×
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comida fuera del recetario: catálogo, a ojo o genérica */}
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
  const over = val > max * 1.05; // 5% tolerancia
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

// ─── Recetario ────────────────────────────────────────────────────────────────────────

function Recetas() {
  const plan = useActivePlan();
  const t = useT();
  const planStart = useStore((s) => s.planStart);
  const momentos: string[] = RECETAS.momentos;
  const actual = faseActual(plan, new Date(), planStart);
  const [momento, setMomento] = useState(momentos[0]);
  const [soloFase, setSoloFase] = useState(true);

  const hoy = dayKey();
  const comidasRaw = useStore((s) => s.comidasDia[hoy]);
  const comidasHoy = comidasRaw ?? [];
  const toggleReceta = useStore((s) => s.toggleRecetaDia);

  const recetas = (RECETAS.recetas as any[]).filter((r) => {
    if (r.momento !== momento) return false;
    if (!soloFase) return true;
    return r.fases.includes("todas") || r.fases.includes(actual);
  });

  return (
    <>
      <h2 className="section-title mt-7 mb-1 text-xl flex items-center gap-2">
        <ChefHat size={18} className="text-accent" /> {t("Recetario")}
      </h2>
      <p className="mb-3 text-xs text-muted">{t(RECETAS.subtitulo)}</p>

      {/* Filtro por momento */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pt-2 pb-1">
        {momentos.map((m) => {
          const comidosEnMomento = (RECETAS.recetas as any[]).filter(
            (r) => r.momento === m && comidasHoy.includes(r.id)
          ).length;
          return (
            <button
              key={m}
              onClick={() => setMomento(m)}
              className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${
                m === momento ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
              }`}
            >
              {t(m)}
              {comidosEnMomento > 0 && (
                <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] text-black font-bold">
                  {comidosEnMomento}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Filtro por fase */}
      <button
        onClick={() => setSoloFase((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"
      >
        <span className="text-muted">
          {soloFase ? `${t("Solo recetas para tu fase:")} ${t(actual)}` : t("Mostrando todas las fases")}
        </span>
        <span className={`h-5 w-9 shrink-0 rounded-full p-0.5 transition ${soloFase ? "bg-accent" : "bg-surface"}`}>
          <span className={`block h-4 w-4 rounded-full bg-black transition ${soloFase ? "translate-x-4" : ""}`} />
        </span>
      </button>

      <p className="mb-2 text-[11px] text-muted">{recetas.length} {t("recetas · pulsa + para registrar lo que comes")}</p>

      <div className="space-y-2">
        {recetas.map((r) => (
          <RecetaCard
            key={r.id}
            receta={r}
            selected={comidasHoy.includes(r.id)}
            onToggle={() => toggleReceta(hoy, r.id)}
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
  receta: any;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        selected
          ? "border-accent/50 bg-accent/[0.06]"
          : "border-line bg-surface-2"
      }`}
    >
      {/* Header de la tarjeta */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => setOpen((o) => !o)}
        >
          <div className="font-medium leading-snug">{t(r.nombre)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span>{r.kcal} kcal · {r.macros}</span>
            <span className="chip gap-1"><Clock size={11} /> {r.tiempo}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Botón toggle: marca la receta como comida */}
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
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Detalle expandible */}
      {open && (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2 animate-fade-up">
          <div>
            <div className="label mb-1">{t("Ingredientes")}</div>
            <ul className="space-y-1 text-sm text-muted">
              {r.ingredientes.map((it: string, j: number) => (
                <li key={j} className="flex gap-2">
                  <span className="text-accent">•</span>{t(it)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="label mb-1">{t("Preparación")}</div>
            <ol className="space-y-1 text-sm text-muted">
              {r.pasos.map((p: string, j: number) => (
                <li key={j} className="flex gap-2">
                  <span className="text-accent">{j + 1}.</span>{t(p)}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Suplementación ───────────────────────────────────────────────────────────────────────

function Suplementacion() {
  const S = SUPLEMENTACION;
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hoy = dayKey();
  const tomadosRaw = useStore((s) => s.suplementosDia[hoy]);
  const tomados = (mounted ? tomadosRaw : undefined) ?? [];
  const toggleSuplemento = useStore((s) => s.toggleSuplementoDia);

  return (
    <>
      <h2 className="section-title mt-7 mb-1 text-xl flex items-center gap-2">
        <Pill size={18} className="text-accent" /> {t(S.titulo)}
      </h2>
      <p className="mb-3 text-xs text-muted">{t(S.intro)}</p>

      <div className="card mb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">{t("Qué tomar y cuándo · marca lo tomado")}</span>
          <span className={`text-[11px] tabular-nums ${tomados.length === S.protocolo.length ? "text-good" : "text-muted"}`}>
            {tomados.length}/{S.protocolo.length} {t("hoy")}
            {tomados.length === S.protocolo.length && " ✓"}
          </span>
        </div>
        <div className="space-y-2">
          {S.protocolo.map((p: any, i: number) => {
            const on = tomados.includes(p.momento);
            return (
              <button
                key={i}
                onClick={() => toggleSuplemento(hoy, p.momento)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition active:scale-[0.99] ${
                  on ? "border-good/60 bg-good/10" : "border-line bg-surface-2"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      on ? "border-good bg-good text-black" : "border-line"
                    }`}
                  >
                    {on && <Check size={13} />}
                  </span>
                  <span>
                    <span className={`block text-sm ${on ? "text-good" : "text-ink"}`}>{t(p.momento)}</span>
                    <span className="block text-xs text-muted">{p.items.map((it: string) => t(it)).join(" · ")}</span>
                  </span>
                </span>
                <span className="chip shrink-0 tabular-nums">{p.hora}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-muted">{t("Se reinicia cada día y queda registrado para el reporte del entrenador.")}</p>
        <Link href="/recordatorios" className="btn-ghost mt-3 w-full gap-2 text-sm">
          <Bell size={15} className="text-accent" /> {t("Activar recordatorios")}
        </Link>
      </div>

      <div className="space-y-2">
        {S.suplementos.map((s: any, i: number) => (
          <details key={i} className="card-2">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <span className="text-xl">{s.emoji}</span>
                <span className="font-medium">{t(s.nombre)}</span>
                {s.esencial && <span className="chip border-accent/50 text-accent">{t("esencial")}</span>}
              </span>
              <span className="max-w-[42%] shrink-0 text-right text-xs leading-tight text-muted">{t(s.dosis)}</span>
            </summary>
            <div className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
              <p><span className="text-accent">{t("Cuándo:")}</span> <span className="text-muted">{t(s.cuando)}</span></p>
              <p className="text-muted">{t(s.porQue)}</p>
            </div>
          </details>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-accent-soft p-3 text-[11px] text-muted">{t(S.nota)}</p>
    </>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────────────────────

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

function Shopping() {
  const t = useT();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <>
      <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
        <ShoppingCart size={18} className="text-accent" /> {t("Lista de la compra")}
      </h2>
      <p className="mb-3 text-xs text-muted">{t(SHOPPING.titulo)}</p>
      <div className="space-y-4">
        {SHOPPING.categorias.map((cat: any, i: number) => (
          <div key={i} className="card-2">
            <div className="mb-2 font-medium text-accent">{t(cat.nombre)}</div>
            <div className="space-y-1.5">
              {cat.items.map((it: string, j: number) => {
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
