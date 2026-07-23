"use client";

// Phase handoff: when a phase of the plan ends, nudge the user to take their
// results back to their AI coach and bring home the next block.
//  - PhaseEndCard: persistent card on Home once a phase is over, until the
//    next plan is imported (or the user dismisses it).
//  - PhaseSaveNotice: same nudge on the workout-saved screen when the saved
//    workout falls in the final week of a phase.
//  - NextPhaseImport: block in Progress to copy the handoff text and paste
//    back the new plan JSON. History is never touched — logs live outside
//    the plan config.

import { useState } from "react";
import Link from "next/link";
import { ClipboardCopy, Check, X, Sparkles, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { finalWeekPhase, lastEndedPhase } from "@/lib/content";
import { buildHandoffText } from "@/lib/report";
import { extractJson, describeParseError, validateConfig, normalizeConfig } from "@/lib/plan-import";
import { useT } from "@/lib/i18n";
import type { UserConfig } from "@/lib/types";

function useHandoffCopy() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const s = useStore.getState();
    if (!s.userConfig) return;
    const text = buildHandoffText(s.userConfig, s.userName, {
      plan: s.userConfig.plan,
      planStart: s.planStart,
      workouts: s.workouts,
      bodyLogs: s.bodyLogs,
      nutrition: s.nutrition,
      freeMeals: s.freeMeals,
      recipes: s.userConfig.recipes,
      recipesEaten: s.recipesEaten,
    });
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return { copied, copy };
}

export function PhaseEndCard({ mounted }: { mounted: boolean }) {
  const t = useT();
  const userConfig = useStore((s) => s.userConfig);
  const planStart = useStore((s) => s.planStart);
  const dismissed = useStore((s) => s.dismissedPhaseNotice);
  const dismiss = useStore((s) => s.dismissPhaseNotice);
  const { copied, copy } = useHandoffCopy();

  if (!mounted || !userConfig) return null;
  const ended = lastEndedPhase(userConfig.plan, planStart);
  if (!ended) return null;
  const key = `${userConfig.plan.id}#${ended.index}`;
  if (dismissed === key) return null;

  return (
    <section className="mt-4 card border-accent/40 animate-fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="label">{t("Fase completada")}</span>
        </div>
        <button onClick={() => dismiss(key)} className="text-muted" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
      <div className="mt-1 font-display text-2xl">{t(ended.name)}</div>
      <p className="mt-1 text-sm text-muted">
        {t("Toca preparar la siguiente fase: copia tu informe y pégaselo a tu entrenador IA. Con su JSON de vuelta, la app se actualiza sin perder tu historial.")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={copy} className="btn-accent gap-1.5">
          {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
          {copied ? t("Copiado") : t("Copiar informe")}
        </button>
        <Link href="/progreso#next-phase" className="btn-ghost">
          {t("Pegar plan nuevo")}
        </Link>
      </div>
    </section>
  );
}

export function PhaseSaveNotice({ date }: { date: string }) {
  const t = useT();
  const userConfig = useStore((s) => s.userConfig);
  const planStart = useStore((s) => s.planStart);
  const { copied, copy } = useHandoffCopy();

  if (!userConfig) return null;
  const phase = finalWeekPhase(userConfig.plan, planStart, new Date(date + "T12:00:00"));
  if (!phase) return null;

  return (
    <div className="mt-5 card border-accent/40 text-left">
      <div className="mb-1 flex items-center gap-2 font-medium text-accent">
        <Sparkles size={16} /> {t("Última semana de")} {t(phase.name)}
      </div>
      <p className="text-xs text-muted">
        {t("Esta fase está terminando. Copia tu informe, llévaselo a tu entrenador IA y prepara la siguiente fase.")}
      </p>
      <button onClick={copy} className="btn-ghost mt-3 w-full gap-1.5">
        {copied ? <Check size={15} className="text-good" /> : <ClipboardCopy size={15} />}
        {copied ? t("Copiado") : t("Copiar informe de fase")}
      </button>
    </div>
  );
}

export function NextPhaseImport({ mounted }: { mounted: boolean }) {
  const t = useT();
  const userConfig = useStore((s) => s.userConfig);
  const planStart = useStore((s) => s.planStart);
  const replacePlan = useStore((s) => s.replacePlan);
  const { copied, copy } = useHandoffCopy();
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!mounted || !userConfig) return null;
  const ended = lastEndedPhase(userConfig.plan, planStart);

  function handleImport() {
    setError(null);
    let parsed: unknown;
    const clean = extractJson(json);
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      setError(`${t("No se pudo leer el JSON. Asegúrate de copiar el bloque completo que te dio la IA.")}\n\n${describeParseError(clean, e)}`);
      return;
    }
    const err = validateConfig(parsed);
    if (err) {
      setError(`${t("Plan no válido:")} ${err}`);
      return;
    }
    replacePlan(normalizeConfig(parsed as UserConfig));
    setJson("");
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  }

  return (
    <details id="next-phase" className={`mb-4 card ${ended ? "border-accent/40" : ""}`} open={!!ended}>
      <summary className="cursor-pointer list-none">
        <span className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span>
            <span className="block text-sm">{t("Siguiente fase")}</span>
            <span className="block text-xs text-muted">
              {ended ? `${t(ended.name)} ${t("ha terminado — prepara el siguiente bloque")}` : t("Copia tu informe y trae el plan del siguiente bloque")}
            </span>
          </span>
        </span>
      </summary>

      <p className="mt-3 text-xs text-muted">
        {t("1. Copia el informe (incluye tu plan, tus resultados y las instrucciones para la IA). 2. Pégalo en tu chat de IA y responde a sus preguntas. 3. Pega aquí el JSON que te devuelva. Tu historial no se toca.")}
      </p>

      <button onClick={copy} className="btn-accent mt-3 w-full gap-1.5">
        {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
        {copied ? t("Copiado") : t("Copiar informe para la IA")}
      </button>

      <textarea
        className="input mt-3 w-full resize-none font-mono text-xs"
        rows={6}
        placeholder={t("Pega aquí el bloque ```json de la nueva fase...")}
        value={json}
        onChange={(e) => { setJson(e.target.value); setError(null); }}
      />

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="whitespace-pre-wrap break-words">{error}</span>
        </div>
      )}

      <button onClick={handleImport} disabled={!json.trim()} className="btn-ghost mt-2 w-full gap-1.5">
        {done ? <Check size={15} className="text-good" /> : null}
        {done ? t("Plan actualizado ✓") : t("Importar nueva fase")}
      </button>
    </details>
  );
}
