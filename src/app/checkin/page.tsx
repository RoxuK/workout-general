"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronLeft, ChevronRight, Scale, TrendingDown, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import type { BodyLog } from "@/lib/types";
import { uid, fmtDate, dayKey } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const STEPS = ["Weight", "Measurements", "How it went"] as const;

export default function CheckIn() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const bodyLogs = useStore((s) => s.bodyLogs);
  const addBody = useStore((s) => s.addBody);
  const t = useT();

  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState<BodyLog | null>(null);
  const [f, setF] = useState<BodyLog>({
    id: uid(),
    date: new Date().toISOString(),
    weight: "", waist: "", hip: "", chest: "", arm: "", thigh: "", bodyFat: "",
    muscleMass: "", visceralFat: "", water: "",
    notes: "",
  });

  const set = (k: keyof BodyLog, v: string) =>
    setF((p) => ({ ...p, [k]: v === "" ? "" : k === "notes" ? v : Number(v) }));

  const latest = mounted ? bodyLogs.find((b) => b.weight !== "") : undefined;

  function save() {
    addBody(f);
    setSaved(f);
  }

  // ── Result screen ───────────────────────────────────────────────────────────
  if (saved) {
    const newWeight = saved.weight !== "" ? Number(saved.weight) : null;
    // The real previous weigh-in: excluding the one we just saved
    const previous = bodyLogs.find((b) => b.weight !== "" && b.id !== saved.id);
    const prevWeight = previous && previous.weight !== "" ? Number(previous.weight) : null;
    const delta = newWeight != null && prevWeight != null ? +(newWeight - prevWeight).toFixed(1) : null;
    return (
      <div className="flex min-h-[70vh] flex-col justify-center text-center animate-fade-up">
        <div className="animate-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-black">
          <Check size={32} />
        </div>
        <h2 className="mt-4 font-display text-3xl">{t("Check-in saved")}</h2>
        <p className="mt-1 text-sm text-muted">{fmtDate(saved.date)}</p>

        {delta != null && (
          <p className={`mt-4 flex items-center justify-center gap-1.5 text-sm ${delta < 0 ? "text-good" : "text-muted"}`}>
            {delta < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {delta < 0 ? `−${Math.abs(delta)} kg` : delta > 0 ? `+${delta} kg` : t("Same")} {t("since the last weigh-in")}
            {previous && <span className="text-muted">({fmtDate(previous.date)})</span>}
          </p>
        )}
        <p className="mx-auto mt-2 max-w-xs text-xs text-muted">
          {t("Remember: trust the weekly trend, not a single day's number.")}
        </p>

        <div className="mt-8 space-y-2">
          <Link href="/progreso" className="btn-accent w-full">{t("See my progress")}</Link>
          <Link href="/" className="btn-ghost w-full">{t("Back to home")}</Link>
        </div>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <Header eyebrow="2 minutes, done" title="Check-in" back="/" />

      {/* Steps */}
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((p, i) => (
          <button
            key={p}
            onClick={() => setStep(i)}
            className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition ${
              i === step
                ? "border-accent bg-accent-soft text-accent"
                : i < step
                ? "border-good/50 text-good"
                : "border-line text-muted"
            }`}
          >
            {i < step ? "✓ " : `${i + 1}. `}{t(p)}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="card text-center animate-fade-up">
          <Scale size={22} className="mx-auto text-accent" />
          <div className="label mt-2">{t("Today's weight (kg)")}</div>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={f.weight}
            onChange={(e) => set("weight", e.target.value)}
            placeholder={latest && latest.weight !== "" ? String(latest.weight) : "75.0"}
            className="input mx-auto mt-2 max-w-44 text-center font-display text-4xl tabular-nums"
          />
          {/* Weigh-in date: defaults to today, editable for logging past days */}
          <label className="mt-3 block">
            <span className="text-[11px] text-muted">{t("Date")}</span>
            <input
              type="date"
              value={f.date.slice(0, 10)}
              max={dayKey()}
              onChange={(e) =>
                setF((p) => ({ ...p, date: new Date(e.target.value + "T08:00:00").toISOString() }))
              }
              className="input mx-auto mt-1 max-w-52 text-center text-sm"
            />
          </label>
          {latest && latest.weight !== "" && (
            <p className="mt-2 text-[11px] text-muted">
              {t("Latest:")} {latest.weight} kg · {fmtDate(latest.date)}
            </p>
          )}
          <p className="mt-3 rounded-xl bg-accent-soft p-2.5 text-[11px] text-muted">
            {t("Same moment every time: right when you wake up, after the bathroom, before breakfast.")}
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="card animate-fade-up">
          <div className="label mb-2">{t("Measurements (optional — once a week is plenty)")}</div>
          <div className="grid grid-cols-2 gap-2">
            <Field l={t("Waist (cm)")} v={f.waist} onChange={(v) => set("waist", v)} />
            <Field l={t("Hip (cm)")} v={f.hip} onChange={(v) => set("hip", v)} />
            <Field l={t("Body fat %")} v={f.bodyFat} onChange={(v) => set("bodyFat", v)} />
            <Field l={t("Chest (cm)")} v={f.chest} onChange={(v) => set("chest", v)} />
            <Field l={t("Arm (cm)")} v={f.arm} onChange={(v) => set("arm", v)} />
            <Field l={t("Thigh (cm)")} v={f.thigh} onChange={(v) => set("thigh", v)} />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer list-none text-xs text-accent">
              {t("+ Smart scale data (optional)")}
            </summary>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Field l={t("Muscle (kg)")} v={f.muscleMass ?? ""} onChange={(v) => set("muscleMass", v)} />
              <Field l={t("Visceral fat")} v={f.visceralFat ?? ""} onChange={(v) => set("visceralFat", v)} />
              <Field l={t("Water %")} v={f.water ?? ""} onChange={(v) => set("water", v)} />
            </div>
          </details>
          <p className="mt-3 text-[11px] text-muted">
            {t("Waist matters most for recomposition: at navel height, no sucking in.")}
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="card animate-fade-up">
          <div className="label mb-2">{t("How was the week?")}</div>
          <textarea
            className="input min-h-28 resize-none"
            placeholder={t("Energy, sleep, hunger, soreness, mood… anything you want your plan to account for.")}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
          <p className="mt-2 text-[11px] text-muted">
            {t("This shows up in your exported report and helps fine-tune the plan. Even a couple of words helps.")}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <button onClick={() => setStep((p) => p - 1)} className="btn-ghost flex-1 gap-1">
            <ChevronLeft size={16} /> {t("Back")}
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep((p) => p + 1)} className="btn-accent flex-1 gap-1">
            {t("Next")} <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={save} className="btn-accent flex-1 gap-1">
            <Check size={16} /> {t("Save check-in")}
          </button>
        )}
      </div>

      <Link href="/recordatorios" className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Bell size={13} className="text-accent" /> {t("Turn on a weekly reminder in Reminders")}
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
