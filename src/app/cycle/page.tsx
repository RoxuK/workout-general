"use client";

import { useEffect, useState } from "react";
import { Check, Trash2, Plus, Info } from "lucide-react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { cycleInfo, phaseForDay, PHASE_LABEL, PHASE_EMOJI, type CyclePhase } from "@/lib/content";
import type { CycleLog } from "@/lib/types";
import { uid, fmtDate, dayKey } from "@/lib/utils";

const FLOWS = ["light", "medium", "heavy"] as const;
const SYMPTOMS = ["Cramps", "Headache", "Low energy", "Bloating", "Mood swings", "Tender breasts", "Cravings", "Good energy"];
const PHASES: CyclePhase[] = ["menstrual", "follicular", "ovulation", "luteal"];

export default function CyclePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cycles = useStore((s) => s.cycles);
  const addCycle = useStore((s) => s.addCycle);
  const deleteCycle = useStore((s) => s.deleteCycle);
  const cycleAvgLength = useStore((s) => s.cycleAvgLength);
  const periodLength = useStore((s) => s.periodLength);

  const [start, setStart] = useState(dayKey());
  const [flow, setFlow] = useState<CycleLog["flow"]>("medium");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const ci = mounted ? cycleInfo(cycles, cycleAvgLength, periodLength, new Date()) : null;

  function toggleSymptom(s: string) {
    setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }

  function save() {
    if (!start) return;
    addCycle({ id: uid(), start, flow, symptoms, notes: notes.trim() });
    setSaved(true);
    setSymptoms([]);
    setNotes("");
    setShowForm(false);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Menstrual cycle" title="Cycle" back="/" />

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-good/40 bg-good/10 p-3 text-sm text-good">
          <Check size={16} /> Period logged.
        </div>
      )}

      {/* Current status */}
      {ci?.hasData && ci.phase ? (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-accent-soft text-3xl">
              {PHASE_EMOJI[ci.phase]}
            </div>
            <div className="flex-1">
              <div className="label">Cycle day {ci.day}</div>
              <div className="font-display text-2xl">{PHASE_LABEL[ci.phase]} phase</div>
              <div className="text-xs text-muted">
                {ci.daysToNext != null && ci.daysToNext >= 0
                  ? `Next period in ~${ci.daysToNext} day${ci.daysToNext === 1 ? "" : "s"} (${fmtDate(ci.nextStart! + "T12:00:00")})`
                  : "Period may be due — log it below when it starts"}
              </div>
            </div>
          </div>

          {/* Phase bar */}
          <PhaseBar day={ci.day!} avg={ci.avgLength} periodLen={periodLength} />
          <div className="mt-1 flex justify-between text-[9px] text-muted">
            {PHASES.map((p) => (
              <span key={p} className={ci.phase === p ? "text-accent" : ""}>
                {PHASE_EMOJI[p]} {PHASE_LABEL[p]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Average cycle length: {ci.avgLength} days{" "}
            {cycles.length < 2 ? "(estimate — log a few cycles to personalise)" : "(from your history)"}.
          </p>
        </div>
      ) : (
        <div className="card text-sm text-muted">
          <p className="flex items-start gap-2">
            <Info size={15} className="mt-0.5 shrink-0 text-accent" />
            Log the first day of your period and the app will track your cycle day, phase and predict the next one. Everything stays on your phone.
          </p>
        </div>
      )}

      {/* Add / form */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="btn-accent mt-4 w-full justify-center gap-2">
          <Plus size={18} /> Log period start
        </button>
      ) : (
        <div className="mt-4 card space-y-4">
          <div className="flex items-center justify-between">
            <span className="label">New period</span>
            <button onClick={() => setShowForm(false)} className="text-xs text-muted">Cancel</button>
          </div>
          <label className="block">
            <span className="label">First day</span>
            <input type="date" value={start} max={dayKey()} onChange={(e) => setStart(e.target.value)} className="input mt-1" />
          </label>
          <div>
            <div className="label mb-1">Flow</div>
            <div className="flex gap-2">
              {FLOWS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFlow(f)}
                  className={`flex-1 rounded-xl border py-2 text-sm capitalize transition ${
                    flow === f ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-1">Symptoms (optional)</div>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    symptoms.includes(s) ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <textarea
            className="input min-h-16 resize-none"
            placeholder="Anything else to note…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button onClick={save} className="btn-accent w-full justify-center gap-2">
            <Check size={18} /> Save
          </button>
        </div>
      )}

      {/* History */}
      {mounted && cycles.length > 0 && (
        <>
          <h2 className="section-title mt-7 mb-3 text-xl">History</h2>
          <div className="space-y-2">
            {cycles.map((c) => (
              <div key={c.id} className="card-2 flex items-start gap-3">
                <span className="text-xl">🩸</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    {fmtDate(c.start + "T12:00:00")}
                    {c.flow ? <span className="text-muted"> · {c.flow} flow</span> : ""}
                  </div>
                  {c.symptoms.length > 0 && (
                    <div className="mt-0.5 text-[11px] text-muted">{c.symptoms.join(" · ")}</div>
                  )}
                  {c.notes && <div className="mt-0.5 text-[11px] text-muted italic">{c.notes}</div>}
                </div>
                <button
                  onClick={() => deleteCycle(c.id)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PhaseBar({ day, avg, periodLen }: { day: number; avg: number; periodLen: number }) {
  // Build a row of cells, one per cycle day, coloured by phase
  const cells = Array.from({ length: avg }, (_, i) => i + 1);
  const COLOR: Record<CyclePhase, string> = {
    menstrual: "var(--bad)",
    follicular: "var(--good)",
    ovulation: "var(--accent)",
    luteal: "var(--warn)",
  };
  return (
    <div className="mt-4 flex gap-[2px]">
      {cells.map((d) => {
        const ph = phaseForDay(d, avg, periodLen);
        const isToday = d === Math.min(day, avg);
        return (
          <span
            key={d}
            className="h-3 flex-1 rounded-[2px]"
            style={{
              background: COLOR[ph],
              opacity: d <= day ? 1 : 0.28,
              outline: isToday ? "2px solid var(--text)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
