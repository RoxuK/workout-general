"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flame,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Check,
  AlertTriangle,
  ChevronLeft,
  Trophy,
  Home,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useActivePlan } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { ExerciseLog, SetLog, WorkoutLog, Session, Plan } from "@/lib/types";
import { uid, todayISO, bestSet, fmtDate, parseTimeSec, isBodyweightOnly, cn } from "@/lib/utils";
import ExerciseImages from "@/components/ExerciseImages";
import PlateCalc from "@/components/PlateCalc";
import { useT } from "@/lib/i18n";

// Keeps the screen on during the workout (Screen Wake Lock API).
// Re-acquired on returning to the tab (the system releases it in the background).
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock = await (navigator as any).wakeLock.request("screen");
      } catch {}
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

export default function Player() {
  const params = useParams<{ sesion: string }>();
  const plan = useActivePlan();
  const t = useT();
  const session = plan.sessions.find((s) => s.id === params.sesion);

  if (!session) {
    return (
      <div className="pt-10 text-center">
        <p className="text-muted">{t("Sesión no encontrada.")}</p>
        <Link href="/entreno" className="btn-ghost mt-4 inline-flex">{t("Volver")}</Link>
      </div>
    );
  }

  // key={session.id}: forces a fresh mount per session, so state (incl.
  // restoring an in-progress draft) always starts clean, without briefly
  // carrying over data from a previously open session.
  return <SessionPlayer key={session.id} session={session} plan={plan} />;
}

function SessionPlayer({ session, plan }: { session: Session; plan: Plan }) {
  const t = useT();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lastWorkoutFor = useStore((s) => s.lastWorkoutFor);
  const addWorkout = useStore((s) => s.addWorkout);
  const workouts = useStore((s) => s.workouts);
  const setWorkoutDraft = useStore((s) => s.setWorkoutDraft);
  const last = mounted ? lastWorkoutFor(session.id) : undefined;

  // Session warmup (travel sessions bring their own, no stationary bike)
  const warmup = session.warmup ?? plan.warmup;

  // Initial state always starts blank: identical on server and on the
  // client's first render (the draft only lives in localStorage, invisible
  // during server rendering). Restoring it directly here broke hydration.
  // It gets restored afterwards, in an effect (see below).
  const [phase, setPhase] = useState<"warmup" | "work">("warmup");
  const [warm, setWarm] = useState<boolean[]>(() => warmup.steps.map(() => false));
  const [logs, setLogs] = useState<ExerciseLog[]>(() =>
    session.exercises.map((e) => ({
      name: e.name,
      sets: Array.from({ length: e.sets }, () => ({ kg: "", reps: "" } as SetLog)),
    }))
  );
  const [rpe, setRpe] = useState(7);
  const [soreness, setSoreness] = useState(4);
  const [notes, setNotes] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState<Summary | null>(null);
  const [restReq, setRestReq] = useState<{ secs: number; n: number } | null>(null);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Screen stays on while training (not during warmup or once finished)
  useWakeLock(phase === "work" && !done);

  // Restore an in-progress workout for this same session (if the phone
  // unloaded the tab in the background, we pick up right where we left off).
  // Client-only, after mount: key={session.id} on the parent already
  // guarantees a fresh mount per session, so this runs once.
  useEffect(() => {
    const draft = useStore.getState().workoutDraft;
    if (draft && draft.sessionId === session.id) {
      setPhase(draft.phase);
      setWarm(draft.warm);
      setLogs(draft.logs);
      setRpe(draft.rpe);
      setSoreness(draft.soreness);
      setNotes(draft.notes);
      setStartedAt(draft.startedAt);
    }
    setHydratedFromDraft(true);
  }, []); // eslint-disable-line

  // Save the in-progress workout on every change: before, this only lived in
  // React memory, so if the phone unloaded the tab in the background
  // (switching app, low memory) every logged set was lost. Waits for the
  // restore above to finish, so it doesn't overwrite a valid draft with the
  // blank values from the first render.
  useEffect(() => {
    if (!hydratedFromDraft || saved) return;
    setWorkoutDraft({ sessionId: session.id, phase, warm, logs, rpe, soreness, notes, startedAt });
  }, [hydratedFromDraft, session.id, phase, warm, logs, rpe, soreness, notes, startedAt, saved, setWorkoutDraft]);

  const allWarm = warm.every(Boolean);

  function updateSet(ei: number, si: number, field: keyof SetLog, value: string) {
    // Starting the rest timer for the exercise the moment reps are logged
    if (field === "reps" && value !== "" && logs[ei]?.sets[si]?.reps === "") {
      const d = parseInt(session.exercises[ei]?.rest ?? "", 10);
      if (d > 0) setRestReq((r) => ({ secs: d, n: (r?.n ?? 0) + 1 }));
    }
    setLogs((prev) => {
      const next = prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
      const v = value === "" ? "" : Number(value);
      next[ei].sets[si][field] = v as never;
      return next;
    });
  }

  function save() {
    const w: WorkoutLog = {
      id: uid(),
      date: todayISO(),
      sessionId: session.id,
      sessionName: session.name,
      exercises: logs,
      rpe,
      soreness,
      notes,
    };

    // Summary for the closing screen (before adding the workout to the store)
    const volume = volumeOf(logs);
    const previousVolume = last ? volumeOf(last.exercises) : null;
    const newPRs: Summary["newPRs"] = [];
    for (const e of logs) {
      const b = bestSet(e.sets);
      if (!b || b.kg <= 0) continue;
      const pr = prMap.get(e.name);
      if (!pr || b.kg > pr.kg || (b.kg === pr.kg && b.reps > pr.reps)) {
        newPRs.push({ name: e.name, kg: b.kg, reps: b.reps });
      }
    }

    addWorkout(w);
    setWorkoutDraft(null);
    setSaved(true);
    setDone({
      durationMin: startedAt ? Math.round((Date.now() - startedAt) / 60000) : null,
      volume,
      previousVolume,
      newPRs,
    });
  }

  function discard() {
    if (!confirm(t("Discard this workout? Everything logged in this session will be lost."))) return;
    setWorkoutDraft(null);
    router.replace("/entreno");
  }

  // Reference to the last time, by exercise name
  const lastByName = useMemo(() => {
    const m = new Map<string, ReturnType<typeof bestSet>>();
    if (last) {
      for (const e of last.exercises) m.set(e.name, bestSet(e.sets));
    }
    return m;
  }, [last]);

  // All-time PR per exercise (best kg, ties broken by reps) — for the 🏆 badge
  const prMap = useMemo(() => {
    const m = new Map<string, { kg: number; reps: number }>();
    if (!mounted) return m;
    for (const w of workouts) {
      for (const e of w.exercises) {
        const b = bestSet(e.sets);
        if (!b || b.kg <= 0) continue;
        const cur = m.get(e.name);
        if (!cur || b.kg > cur.kg || (b.kg === cur.kg && b.reps > cur.reps)) {
          m.set(e.name, b);
        }
      }
    }
    return m;
  }, [workouts, mounted]);

  // Progressive overload: if last time all sets hit the target reps,
  // suggest +2.5 kg
  const suggestions = useMemo(() => {
    const m = new Map<string, number>();
    if (!last || !session) return m;
    for (const ej of session.exercises) {
      const log = last.exercises.find((e) => e.name === ej.name);
      if (!log) continue;
      const target = parseInt(ej.reps, 10) || 0;
      const sets = log.sets.filter((s) => typeof s.kg === "number" && s.kg > 0);
      if (sets.length < ej.sets || target <= 0) continue;
      const all = sets.every((s) => typeof s.reps === "number" && s.reps >= target);
      if (all) {
        const maxKg = Math.max(...sets.map((s) => Number(s.kg)));
        m.set(ej.name, Math.round((maxKg + 2.5) * 2) / 2);
      }
    }
    return m;
  }, [last, session]);

  return (
    <div className="animate-fade-up pb-6">
      <header className="flex items-center justify-between pt-3">
        <Link href="/entreno" className="inline-flex items-center gap-1 text-xs text-muted">
          <ChevronLeft size={16} /> {t("Sesiones")}
        </Link>
        <div className="flex items-center gap-3">
          {last && (
            <span className="chip">{t("Última:")} {fmtDate(last.date)}</span>
          )}
          <button onClick={discard} className="inline-flex items-center gap-1 text-xs text-bad">
            <Trash2 size={14} /> {t("Discard")}
          </button>
        </div>
      </header>

      <h1 className="mt-2 font-display text-3xl">{t(session.name)}</h1>
      <p className="text-sm text-muted">{t(session.focus)}</p>

      {phase === "warmup" ? (
        <Warmup
          steps={warmup.steps}
          warm={warm}
          setWarm={setWarm}
          note={warmup.note}
          duration={warmup.duration}
          allWarm={allWarm}
          onStart={() => {
            setStartedAt(Date.now());
            setPhase("work");
          }}
        />
      ) : (
        <>
          <RestTimer auto={restReq} />

          <div className="mt-4 space-y-4">
            {session.exercises.map((ej, ei) => {
              const prev = lastByName.get(ej.name);
              const pr = prMap.get(ej.name);
              const sug = suggestions.get(ej.name);
              const timedSecs = parseTimeSec(ej.reps);
              const bodyweightOnly = timedSecs == null && isBodyweightOnly(ej.name);
              const exSets = logs[ei]?.sets ?? [];
              const allDone = exSets.length > 0 && exSets.every((s) => s.reps !== "");
              return (
                <div key={ei} className={cn("card", allDone && "border-good/50")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium leading-snug">
                        {t(ej.name)}
                        {allDone && <Check size={15} className="shrink-0 text-good" />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {ej.sets} × {t(ej.reps)} · {t("descanso")} {ej.rest}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {pr && pr.kg > 0 && (
                          <span className="chip border-accent/50 text-accent">🏆 {pr.kg} kg × {pr.reps}</span>
                        )}
                        {ej.core && <span className="chip">{t("core")}</span>}
                      </div>
                    </div>
                    <ExerciseImages name={ej.name} />
                  </div>

                  {ej.notes && <p className="mt-2 text-xs text-muted">{t(ej.notes)}</p>}

                  {prev && prev.kg > 0 ? (
                    <p className="mt-2 text-xs text-accent">
                      {t("Última vez:")} {prev.kg} kg × {prev.reps}
                      {sug ? ` · ${t("hoy prueba")} ${sug} kg ✨` : ` · ${t("iguálalo antes de subir")}`}
                    </p>
                  ) : prev ? (
                    <p className="mt-2 text-xs text-accent">
                      {t("Última vez:")} {timedSecs != null ? `${prev.reps} s` : `${prev.reps} reps/seg`} {t("→ intenta superarlo")}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {exSets.map((s, si) =>
                      timedSecs != null ? (
                        <div key={si} className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs text-muted">{si + 1}</span>
                          <TimedSetPill
                            targetSecs={timedSecs}
                            value={s.reps}
                            onChange={(v) => updateSet(ei, si, "reps", v)}
                          />
                        </div>
                      ) : bodyweightOnly ? (
                        <div key={si} className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs text-muted">{si + 1}</span>
                          <NumInput
                            placeholder="reps"
                            value={s.reps}
                            onChange={(v) => updateSet(ei, si, "reps", v)}
                          />
                        </div>
                      ) : (
                        <div key={si} className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs text-muted">{si + 1}</span>
                          <NumInput
                            placeholder="kg"
                            value={s.kg}
                            onChange={(v) => updateSet(ei, si, "kg", v)}
                          />
                          <span className="text-muted">×</span>
                          <NumInput
                            placeholder="reps"
                            value={s.reps}
                            onChange={(v) => updateSet(ei, si, "reps", v)}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {session.postCardio && (
            <p className="mt-4 rounded-xl bg-accent-soft p-3 text-xs text-muted">
              {t("Cardio post:")} {t(session.postCardio)}
            </p>
          )}

          {/* RPE + recovery */}
          <div className="mt-5 card space-y-5">
            <Slider
              label={t("RPE de la sesión")}
              hint={t("esfuerzo percibido (1 fácil – 10 al fallo)")}
              min={1}
              max={10}
              value={rpe}
              onChange={setRpe}
            />
            <Slider
              label={t("Cómo se sintió tu cuerpo")}
              hint={t("1 mal · 5 perfecta")}
              min={1}
              max={5}
              value={soreness}
              onChange={setSoreness}
              tone={soreness <= 2 ? "bad" : "good"}
            />
            {soreness <= 2 && plan.safetyNote && (
              <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs text-muted">
                <div className="mb-1 flex items-center gap-1 font-medium text-bad">
                  <AlertTriangle size={14} /> {t("Aviso")}
                </div>
                {t(plan.safetyNote)}
              </div>
            )}
            <div>
              <div className="label mb-1">{t("Notas / sensaciones")}</div>
              <textarea
                className="input min-h-20 resize-none"
                placeholder={t("Energía, dolores, técnica, lo que sea…")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <button onClick={save} disabled={saved} className="btn-accent mt-5 w-full">
            {saved ? (
              <>
                <Check size={18} /> {t("¡Guardado!")}
              </>
            ) : (
              t("Guardar entreno")
            )}
          </button>
        </>
      )}

      {done && <DoneOverlay summary={done} sessionName={session.name} />}
    </div>
  );
}

// ─── Session close ───────────────────────────────────────────────────────────

type Summary = {
  durationMin: number | null;
  volume: number;
  previousVolume: number | null;
  newPRs: { name: string; kg: number; reps: number }[];
};

function volumeOf(exercises: ExerciseLog[]) {
  let v = 0;
  for (const e of exercises) {
    for (const s of e.sets) {
      const kg = typeof s.kg === "number" ? s.kg : 0;
      const reps = typeof s.reps === "number" ? s.reps : 0;
      if (kg > 0 && reps > 0) v += kg * reps;
    }
  }
  return v;
}

function DoneOverlay({ summary, sessionName }: { summary: Summary; sessionName: string }) {
  const t = useT();
  const diff = summary.previousVolume != null ? summary.volume - summary.previousVolume : null;

  // The page wrapper has a residual transform (animate-fade-up with fill
  // "both"), which makes that div the containing block for `fixed`.
  // The portal moves the overlay to <body> so it covers the real viewport.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg px-4 pb-10">
      <ConfettiBurst />
      <div className="mx-auto flex min-h-full w-full max-w-app flex-col justify-center py-10 text-center animate-fade-up">
        <div className="animate-pop mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-black">
          <Check size={32} />
        </div>
        <h2 className="mt-4 font-display text-3xl">{t("¡Sesión completada!")}</h2>
        <p className="mt-1 text-sm text-muted">{t(sessionName)}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card-2 py-4">
            <div className="font-display text-2xl tabular-nums">
              {summary.durationMin != null ? `${summary.durationMin}′` : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{t("Duración")}</div>
          </div>
          <div className="card-2 py-4">
            <div className="font-display text-2xl tabular-nums">
              {Math.round(summary.volume).toLocaleString("en-GB")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{t("kg movidos")}</div>
          </div>
        </div>

        {diff != null && diff !== 0 && (
          <p className={`mt-3 flex items-center justify-center gap-1 text-sm ${diff > 0 ? "text-good" : "text-muted"}`}>
            <TrendingUp size={15} />
            {diff > 0
              ? `+${Math.round(diff).toLocaleString("en-GB")} ${t("kg más que la última vez")}`
              : `${Math.round(diff).toLocaleString("en-GB")} ${t("kg vs la última vez")}`}
          </p>
        )}

        {summary.newPRs.length > 0 && (
          <div className="mt-5 card border-accent/40 text-left">
            <div className="mb-2 flex items-center gap-2 font-medium text-accent">
              <Trophy size={16} /> {summary.newPRs.length === 1 ? t("¡Nuevo récord!") : `${summary.newPRs.length} ${t("récords nuevos")}`}
            </div>
            <div className="space-y-1.5">
              {summary.newPRs.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="pr-2">{t(p.name)}</span>
                  <span className="shrink-0 font-display text-accent tabular-nums">
                    {p.kg} kg × {p.reps}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 space-y-2">
          <Link href="/progreso" className="btn-accent w-full">{t("Ver mi progreso")}</Link>
          <Link href="/" className="btn-ghost w-full gap-2">
            <Home size={16} /> {t("Volver al inicio")}
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Canvas confetti: bursts with physics (gravity, drag, simulated 3D spin)
// exploding from the check mark area. Cleans itself up when done.
function ConfettiBurst() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(document.documentElement);
    const colors = ["--accent", "--good", "--warn", "--grad-a", "--grad-b"]
      .map((v) => css.getPropertyValue(v).trim())
      .filter(Boolean);

    type Piece = {
      x: number; y: number; vx: number; vy: number;
      w: number; h: number; rot: number; vr: number;
      color: string; circle: boolean; life: number; ttl: number;
    };
    const pieces: Piece[] = [];

    function burst(x: number, y: number, n: number, speed: number) {
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.6);
        pieces.push({
          x, y,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v - speed * 0.55, // upward bias
          w: 5 + Math.random() * 5,
          h: 8 + Math.random() * 6,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.35,
          color: colors[(Math.random() * colors.length) | 0],
          circle: Math.random() < 0.25,
          life: 0,
          ttl: 130 + Math.random() * 90,
        });
      }
    }

    // Main burst from the checkmark plus two staggered side bursts
    burst(W / 2, H * 0.3, 70, 9);
    const t1 = setTimeout(() => burst(W * 0.18, H * 0.4, 32, 7.5), 200);
    const t2 = setTimeout(() => burst(W * 0.82, H * 0.4, 32, 7.5), 360);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of pieces) {
        if (p.life >= p.ttl) continue;
        alive = true;
        p.life++;
        p.vy += 0.16;   // gravity
        p.vx *= 0.985;  // drag
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.globalAlpha = Math.min(1, (1 - p.life / p.ttl) * 1.6);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // "3D flip": the width oscillates like a card spinning in the air
        ctx.scale(Math.sin(p.life * 0.15 + p.rot) * 0.6 + 0.7, 1);
        if (p.circle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (alive) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // h-full/w-full: inset-0 doesn't stretch replaced elements like <canvas>
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

function Warmup({
  steps,
  warm,
  setWarm,
  note,
  duration,
  allWarm,
  onStart,
}: {
  steps: { exercise: string; detail: string }[];
  warm: boolean[];
  setWarm: (f: (p: boolean[]) => boolean[]) => void;
  note: string;
  duration: string;
  allWarm: boolean;
  onStart: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-5 animate-fade-up">
      <div className="mb-3 flex items-center gap-2 text-sm text-accent">
        <Flame size={16} /> {t("Calentamiento")} {duration} · {t("no te lo saltes")}
      </div>
      <div className="space-y-2">
        {steps.map((p, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 rounded-2xl border p-3 transition ${
              warm[i] ? "border-accent/60 bg-accent-soft" : "border-line bg-surface"
            }`}
          >
            <button
              onClick={() => setWarm((prev) => prev.map((b, j) => (j === i ? !b : b)))}
              className="flex flex-1 items-start gap-3 text-left"
            >
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  warm[i] ? "border-accent bg-accent text-black" : "border-line"
                }`}
              >
                {warm[i] && <Check size={13} />}
              </span>
              <span>
                <span className="text-sm text-ink">{t(p.exercise)}</span>
                <span className="block text-xs text-muted">{t(p.detail)}</span>
              </span>
            </button>
            <ExerciseImages name={p.exercise} />
          </div>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-accent-soft p-3 text-xs text-muted">{t(note)}</p>
      <button onClick={onStart} disabled={!allWarm} className="btn-accent mt-4 w-full">
        {allWarm ? t("Empezar la sesión") : t("Marca el calentamiento para empezar")}
      </button>
      <button onClick={onStart} className="mt-2 w-full text-center text-xs text-muted underline">
        {t("Saltar calentamiento (no recomendado)")}
      </button>
    </div>
  );
}

function restAlarm() {
  try {
    navigator.vibrate?.([200, 120, 200]);
  } catch {}
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {}
}

function RestTimer({ auto }: { auto: { secs: number; n: number } | null }) {
  const presets = [45, 60, 90];
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  // Real-clock deadline, not a counter ticked down blindly: phones
  // pause/throttle setInterval in the background, so a naive counter drifts.
  // With a target timestamp, the remaining time is always recomputed from
  // Date.now(), regardless of how many ticks were missed in the background.
  const endAtRef = useRef<number | null>(null);

  // Auto-start when logging the reps of a set
  useEffect(() => {
    if (auto && auto.secs > 0) {
      endAtRef.current = Date.now() + auto.secs * 1000;
      setSecs(auto.secs);
      setRunning(true);
    }
  }, [auto?.n]); // eslint-disable-line

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setSecs(left);
      if (left <= 0) {
        setRunning(false);
        restAlarm();
      }
    };
    tick(); // corrects immediately, covers returning from the background
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  function start(newSecs: number) {
    endAtRef.current = Date.now() + newSecs * 1000;
    setSecs(newSecs);
    setRunning(true);
  }

  function toggle() {
    if (running) {
      setRunning(false); // pause: secs stays at the last computed value
    } else if (secs > 0) {
      endAtRef.current = Date.now() + secs * 1000; // resume from where it was
      setRunning(true);
    }
  }

  function reset() {
    endAtRef.current = null;
    setSecs(0);
    setRunning(false);
  }

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <div className="sticky top-2 z-30 mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface-2/90 p-2 backdrop-blur">
      <div className="flex items-center gap-2 pl-1">
        <Timer size={18} className="text-accent" />
        <span className="font-display text-2xl tabular-nums">{mmss}</span>
      </div>
      <div className="flex items-center gap-1">
        <PlateCalc />
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => start(p)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted active:scale-95"
          >
            {p}s
          </button>
        ))}
        <button
          onClick={toggle}
          className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-black"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={reset}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | "";
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      inputMode="decimal"
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-surface-2 py-2.5 text-center text-lg tabular-nums outline-none focus:border-accent"
    />
  );
}

// Full-width pill for held-for-time sets (plank, hollow body hold...) — no kg
// field, since an isometric hold doesn't have one. Same real-clock deadline
// pattern as RestTimer, so it doesn't drift if the tab is backgrounded.
function TimedSetPill({
  targetSecs,
  value,
  onChange,
}: {
  targetSecs: number;
  value: number | "";
  onChange: (v: string) => void;
}) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(targetSecs);
  const endAtRef = useRef<number | null>(null);
  const done = value !== "";

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAtRef.current == null) return;
      const remaining = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        setRunning(false);
        restAlarm();
        onChange(String(targetSecs));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]); // eslint-disable-line

  function tap() {
    if (done) {
      // Already completed — tapping again resets it, in case the set needs a redo.
      onChange("");
      setLeft(targetSecs);
      return;
    }
    if (running) return;
    endAtRef.current = Date.now() + targetSecs * 1000;
    setLeft(targetSecs);
    setRunning(true);
  }

  return (
    <button
      onClick={tap}
      className={`w-full rounded-xl border py-2.5 text-center text-lg tabular-nums transition ${
        done
          ? "border-good/60 bg-good/10 text-good"
          : running
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface-2 text-ink"
      }`}
    >
      {done ? `✓ ${value} s` : running ? `${left}s` : `▷ ${targetSecs}s`}
    </button>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  value,
  onChange,
  tone = "default",
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  tone?: "default" | "good" | "bad";
}) {
  const color = tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : "var(--accent)";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="font-display text-2xl" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        style={{ accentColor: color }}
      />
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
