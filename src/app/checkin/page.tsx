"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronLeft, ChevronRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import type { BodyLog } from "@/lib/types";
import { uid, fmtDate, dayKey } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const PASOS = ["Peso", "Medidas", "Sensaciones"] as const;

export default function CheckIn() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bodyLogs = useStore((s) => s.bodyLogs);
  const addBody = useStore((s) => s.addBody);
  const t = useT();

  const [paso, setPaso] = useState(0);
  const [saved, setSaved] = useState<BodyLog | null>(null);
  const [f, setF] = useState<BodyLog>({
    id: uid(),
    fecha: new Date().toISOString(),
    peso: "", cintura: "", cadera: "", pecho: "", brazo: "", muslo: "", grasa: "",
    masaMuscular: "", visceral: "", agua: "",
    notas: "",
  });

  const set = (k: keyof BodyLog, v: string) =>
    setF((p) => ({ ...p, [k]: v === "" ? "" : k === "notas" ? v : Number(v) }));

  const ultimo = mounted ? bodyLogs.find((b) => b.peso !== "") : undefined;

  function guardar() {
    addBody(f);
    setSaved(f);
  }

  // ── Pantalla de resultado ──────────────────────────────────────────────────
  if (saved) {
    const pesoNuevo = saved.peso !== "" ? Number(saved.peso) : null;
    // El pesaje anterior de verdad: excluyendo el que acabamos de guardar
    const anterior = bodyLogs.find((b) => b.peso !== "" && b.id !== saved.id);
    const pesoPrev = anterior && anterior.peso !== "" ? Number(anterior.peso) : null;
    const delta = pesoNuevo != null && pesoPrev != null ? +(pesoNuevo - pesoPrev).toFixed(1) : null;
    return (
      <div className="flex min-h-[70vh] flex-col justify-center text-center animate-fade-up">
        <div className="animate-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-black">
          <Check size={32} />
        </div>
        <h2 className="mt-4 font-display text-3xl">{t("Check-in guardado")}</h2>
        <p className="mt-1 text-sm text-muted">{fmtDate(saved.fecha)}</p>

        {delta != null && (
          <p className={`mt-4 flex items-center justify-center gap-1.5 text-sm ${delta < 0 ? "text-good" : "text-muted"}`}>
            {delta < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {delta < 0 ? `−${Math.abs(delta)} kg` : delta > 0 ? `+${delta} kg` : t("Igual")} {t("desde el último pesaje")}
            {anterior && <span className="text-muted">({fmtDate(anterior.fecha)})</span>}
          </p>
        )}
        <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
          {t("Recuerda: fíate de la tendencia semanal, no del número de un día.")}
        </p>

        <div className="mt-8 space-y-2">
          <Link href="/progreso" className="btn-accent w-full">{t("Ver mi progreso")}</Link>
          <Link href="/" className="btn-ghost w-full">{t("Volver al inicio")}</Link>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <Header eyebrow="2 minutos y listo" title="Check-in" back="/" />

      {/* Pasos */}
      <div className="mb-5 flex items-center gap-2">
        {PASOS.map((p, i) => (
          <button
            key={p}
            onClick={() => setPaso(i)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition ${
              i === paso
                ? "border-accent bg-accent-soft text-accent"
                : i < paso
                ? "border-good/50 text-good"
                : "border-line text-muted"
            }`}
          >
            {i < paso ? "✓ " : `${i + 1}. `}{t(p)}
          </button>
        ))}
      </div>

      {paso === 0 && (
        <div className="card text-center animate-fade-up">
          <Scale size={22} className="mx-auto text-accent" />
          <div className="label mt-2">{t("Peso de hoy (kg)")}</div>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={f.peso}
            onChange={(e) => set("peso", e.target.value)}
            placeholder={ultimo && ultimo.peso !== "" ? String(ultimo.peso) : "86,0"}
            className="input mx-auto mt-2 max-w-44 text-center font-display text-4xl tabular-nums"
          />
          {/* Fecha del pesaje: hoy por defecto, editable para apuntar días pasados */}
          <label className="mt-3 block">
            <span className="text-[11px] text-muted">{t("Fecha")}</span>
            <input
              type="date"
              value={f.fecha.slice(0, 10)}
              max={dayKey()}
              onChange={(e) =>
                setF((p) => ({ ...p, fecha: new Date(e.target.value + "T08:00:00").toISOString() }))
              }
              className="input mx-auto mt-1 max-w-52 text-center text-sm"
            />
          </label>
          {ultimo && ultimo.peso !== "" && (
            <p className="mt-2 text-[11px] text-muted">
              {t("Último:")} {ultimo.peso} kg · {fmtDate(ultimo.fecha)}
            </p>
          )}
          <p className="mt-3 rounded-xl bg-accent-soft p-2.5 text-[11px] text-muted">
            {t("Mismo momento siempre: al levantarte, después del baño, antes de desayunar.")}
          </p>
        </div>
      )}

      {paso === 1 && (
        <div className="card animate-fade-up">
          <div className="label mb-2">{t("Medidas (opcional — con que las apuntes 1 vez por semana, perfecto)")}</div>
          <div className="grid grid-cols-2 gap-2">
            <Field l={t("Cintura (cm)")} v={f.cintura} onChange={(v) => set("cintura", v)} />
            <Field l={t("Cadera (cm)")} v={f.cadera} onChange={(v) => set("cadera", v)} />
            <Field l={t("% Grasa")} v={f.grasa} onChange={(v) => set("grasa", v)} />
            <Field l={t("Pecho (cm)")} v={f.pecho} onChange={(v) => set("pecho", v)} />
            <Field l={t("Brazo (cm)")} v={f.brazo} onChange={(v) => set("brazo", v)} />
            <Field l={t("Muslo (cm)")} v={f.muslo} onChange={(v) => set("muslo", v)} />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-xs text-accent">
              {t("+ Datos de la báscula inteligente (opcional)")}
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Field l={t("Músculo (kg)")} v={f.masaMuscular ?? ""} onChange={(v) => set("masaMuscular", v)} />
              <Field l={t("G. visceral")} v={f.visceral ?? ""} onChange={(v) => set("visceral", v)} />
              <Field l={t("% Agua")} v={f.agua ?? ""} onChange={(v) => set("agua", v)} />
            </div>
            <p className="mt-2 text-[10px] text-muted">
              {t("O más fácil: mándale las capturas de la báscula al entrenador por el chat y él vuelca todos los datos.")}
            </p>
          </details>
          <p className="mt-3 text-[11px] text-muted">
            {t("La cintura es la que más cuenta para la recomposición: a la altura del ombligo, sin meter tripa.")}
          </p>
        </div>
      )}

      {paso === 2 && (
        <div className="card animate-fade-up">
          <div className="label mb-2">{t("¿Cómo fue la semana?")}</div>
          <textarea
            className="input min-h-28 resize-none"
            placeholder={t("Energía, sueño, hambre, agujetas, lumbar, ánimo… lo que quieras que sepa tu entrenador.")}
            value={f.notas}
            onChange={(e) => set("notas", e.target.value)}
          />
          <p className="mt-2 text-[11px] text-muted">
            {t("Esto sale en el Excel del entrenador y ayuda a ajustar el plan. Aunque sean dos palabras.")}
          </p>
        </div>
      )}

      {/* Navegación */}
      <div className="mt-4 flex gap-2">
        {paso > 0 && (
          <button onClick={() => setPaso((p) => p - 1)} className="btn-ghost flex-1 gap-1">
            <ChevronLeft size={16} /> {t("Atrás")}
          </button>
        )}
        {paso < PASOS.length - 1 ? (
          <button onClick={() => setPaso((p) => p + 1)} className="btn-accent flex-1 gap-1">
            {t("Siguiente")} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={guardar} className="btn-accent flex-1 gap-1">
            <Check size={16} /> {t("Guardar check-in")}
          </button>
        )}
      </div>

      <Link href="/recordatorios" className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Bell size={13} className="text-accent" /> {t("Actívate un recordatorio semanal en Recordatorios")}
      </Link>
    </div>
  );
}

function Field({ l, v, onChange }: { l: string; v: number | ""; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-muted">{l}</span>
      <input
        type="number"
        inputMode="decimal"
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="input mt-0.5 text-center tabular-nums"
      />
    </label>
  );
}
