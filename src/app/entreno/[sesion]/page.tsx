"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { useActivePlan } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { EjercicioLog, SetLog, WorkoutLog } from "@/lib/types";
import { uid, todayISO, bestSet, fmtDate } from "@/lib/utils";
import ExerciseImages from "@/components/ExerciseImages";
import PlateCalc from "@/components/PlateCalc";
import { useT } from "@/lib/i18n";

// Pantalla siempre encendida durante el entreno (Screen Wake Lock API).
// Se re-adquiere al volver a la pestaña (el sistema lo suelta al ir a segundo plano).
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
  const sesion = plan.sesiones.find((s) => s.id === params.sesion);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const lastWorkoutFor = useStore((s) => s.lastWorkoutFor);
  const addWorkout = useStore((s) => s.addWorkout);
  const workouts = useStore((s) => s.workouts);
  const ultima = mounted && sesion ? lastWorkoutFor(sesion.id) : undefined;

  // Calentamiento de la sesión (las de viaje traen el suyo, sin bici estática)
  const calentamiento = sesion?.calentamiento ?? plan.calentamiento;

  const [phase, setPhase] = useState<"warmup" | "work">("warmup");
  const [warm, setWarm] = useState<boolean[]>(() =>
    calentamiento.pasos.map(() => false)
  );
  const [logs, setLogs] = useState<EjercicioLog[]>([]);
  const [rpe, setRpe] = useState(7);
  const [lumbar, setLumbar] = useState(4);
  const [notas, setNotas] = useState("");
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState<Resumen | null>(null);
  const [restReq, setRestReq] = useState<{ secs: number; n: number } | null>(null);
  const startRef = useRef<number | null>(null);

  // Pantalla encendida mientras se entrena (no en calentamiento ni al acabar)
  useWakeLock(phase === "work" && !done);

  useEffect(() => {
    if (sesion) {
      setLogs(
        sesion.ejercicios.map((e) => ({
          nombre: e.nombre,
          sets: Array.from({ length: e.series }, () => ({ kg: "", reps: "" } as SetLog)),
        }))
      );
    }
  }, [sesion?.id]); // eslint-disable-line

  if (!sesion) {
    return (
      <div className="pt-10 text-center">
        <p className="text-muted">{t("Sesión no encontrada.")}</p>
        <Link href="/entreno" className="btn-ghost mt-4 inline-flex">{t("Volver")}</Link>
      </div>
    );
  }

  const allWarm = warm.every(Boolean);

  function updateSet(ei: number, si: number, field: keyof SetLog, value: string) {
    // Al apuntar las reps de una serie, arranca solo el descanso del ejercicio
    if (field === "reps" && value !== "" && logs[ei]?.sets[si]?.reps === "") {
      const d = parseInt(sesion!.ejercicios[ei]?.descanso ?? "", 10);
      if (d > 0) setRestReq((r) => ({ secs: d, n: (r?.n ?? 0) + 1 }));
    }
    setLogs((prev) => {
      const next = prev.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) }));
      const v = value === "" ? "" : Number(value);
      next[ei].sets[si][field] = v as never;
      return next;
    });
  }

  function guardar() {
    const w: WorkoutLog = {
      id: uid(),
      fecha: todayISO(),
      sesionId: sesion!.id,
      sesionNombre: sesion!.nombre,
      ejercicios: logs,
      rpe,
      lumbar,
      notas,
    };

    // Resumen para la pantalla de cierre (antes de añadir el workout al store)
    const volumen = volumenDe(logs);
    const volumenPrev = ultima ? volumenDe(ultima.ejercicios) : null;
    const prsNuevos: Resumen["prsNuevos"] = [];
    for (const e of logs) {
      const b = bestSet(e.sets);
      if (!b || b.kg <= 0) continue;
      const pr = prMap.get(e.nombre);
      if (!pr || b.kg > pr.kg || (b.kg === pr.kg && b.reps > pr.reps)) {
        prsNuevos.push({ nombre: e.nombre, kg: b.kg, reps: b.reps });
      }
    }

    addWorkout(w);
    setSaved(true);
    setDone({
      duracionMin: startRef.current ? Math.round((Date.now() - startRef.current) / 60000) : null,
      volumen,
      volumenPrev,
      prsNuevos,
    });
  }

  // referencia de la última vez por nombre de ejercicio
  const lastByName = useMemo(() => {
    const m = new Map<string, ReturnType<typeof bestSet>>();
    if (ultima) {
      for (const e of ultima.ejercicios) m.set(e.nombre, bestSet(e.sets));
    }
    return m;
  }, [ultima]);

  // PR histórico por ejercicio (mejor kg, desempate por reps) — para el badge 🏆
  const prMap = useMemo(() => {
    const m = new Map<string, { kg: number; reps: number }>();
    if (!mounted) return m;
    for (const w of workouts) {
      for (const e of w.ejercicios) {
        const b = bestSet(e.sets);
        if (!b || b.kg <= 0) continue;
        const cur = m.get(e.nombre);
        if (!cur || b.kg > cur.kg || (b.kg === cur.kg && b.reps > cur.reps)) {
          m.set(e.nombre, b);
        }
      }
    }
    return m;
  }, [workouts, mounted]);

  // Sobrecarga progresiva: si la última vez completó todas las series con las
  // reps objetivo, sugerir +2,5 kg
  const sugerencias = useMemo(() => {
    const m = new Map<string, number>();
    if (!ultima || !sesion) return m;
    for (const ej of sesion.ejercicios) {
      const log = ultima.ejercicios.find((e) => e.nombre === ej.nombre);
      if (!log) continue;
      const target = parseInt(ej.reps, 10) || 0;
      const sets = log.sets.filter((s) => typeof s.kg === "number" && s.kg > 0);
      if (sets.length < ej.series || target <= 0) continue;
      const all = sets.every((s) => typeof s.reps === "number" && s.reps >= target);
      if (all) {
        const maxKg = Math.max(...sets.map((s) => Number(s.kg)));
        m.set(ej.nombre, Math.round((maxKg + 2.5) * 2) / 2);
      }
    }
    return m;
  }, [ultima, sesion]);

  return (
    <div className="animate-fade-up pb-6">
      <header className="flex items-center justify-between pt-3">
        <Link href="/entreno" className="inline-flex items-center gap-1 text-xs text-muted">
          <ChevronLeft size={16} /> {t("Sesiones")}
        </Link>
        {ultima && (
          <span className="chip">{t("Última:")} {fmtDate(ultima.fecha)}</span>
        )}
      </header>

      <h1 className="mt-2 font-display text-3xl">{t(sesion.nombre)}</h1>
      <p className="text-sm text-muted">{t(sesion.foco)}</p>

      {phase === "warmup" ? (
        <Warmup
          pasos={calentamiento.pasos}
          warm={warm}
          setWarm={setWarm}
          nota={calentamiento.nota}
          duracion={calentamiento.duracion}
          allWarm={allWarm}
          onStart={() => {
            startRef.current = Date.now();
            setPhase("work");
          }}
        />
      ) : (
        <>
          <RestTimer auto={restReq} />

          <div className="mt-4 space-y-4">
            {sesion.ejercicios.map((ej, ei) => {
              const prev = lastByName.get(ej.nombre);
              const pr = prMap.get(ej.nombre);
              const sug = sugerencias.get(ej.nombre);
              return (
                <div key={ei} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium leading-snug">{t(ej.nombre)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {ej.series} × {t(ej.reps)} · {t("descanso")} {ej.descanso}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {pr && pr.kg > 0 && (
                          <span className="chip border-accent/50 text-accent">🏆 {pr.kg} kg × {pr.reps}</span>
                        )}
                        {ej.lumbar && <span className="chip border-warn/50 text-warn">{t("lumbar")}</span>}
                        {ej.core && <span className="chip">{t("core")}</span>}
                      </div>
                    </div>
                    <ExerciseImages nombre={ej.nombre} />
                  </div>

                  {ej.notas && <p className="mt-2 text-xs text-muted">{t(ej.notas)}</p>}

                  {prev && prev.kg > 0 ? (
                    <p className="mt-2 text-xs text-accent">
                      {t("Última vez:")} {prev.kg} kg × {prev.reps}
                      {sug ? ` · ${t("hoy prueba")} ${sug} kg ✨` : ` · ${t("iguálalo antes de subir")}`}
                    </p>
                  ) : prev ? (
                    <p className="mt-2 text-xs text-accent">
                      {t("Última vez:")} {prev.reps} {t("reps/seg → intenta superarlo")}
                    </p>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {logs[ei]?.sets.map((s, si) => (
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {sesion.cardioPost && (
            <p className="mt-4 rounded-xl bg-accent-soft p-3 text-xs text-muted">
              {t("Cardio post:")} {t(sesion.cardioPost)}
            </p>
          )}

          {/* RPE + lumbar */}
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
              label={t("Sensación lumbar")}
              hint={t("1 mal · 5 perfecta")}
              min={1}
              max={5}
              value={lumbar}
              onChange={setLumbar}
              tone={lumbar <= 2 ? "bad" : "good"}
            />
            {lumbar <= 2 && (
              <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs text-muted">
                <div className="mb-1 flex items-center gap-1 font-medium text-bad">
                  <AlertTriangle size={14} /> {t("Atención lumbar")}
                </div>
                {t(plan.reglaLumbar)}
              </div>
            )}
            <div>
              <div className="label mb-1">{t("Notas / sensaciones")}</div>
              <textarea
                className="input min-h-20 resize-none"
                placeholder={t("Energía, dolores, técnica, lo que sea…")}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>

          <button onClick={guardar} disabled={saved} className="btn-accent mt-5 w-full">
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

      {done && <DoneOverlay resumen={done} sesionNombre={sesion.nombre} />}
    </div>
  );
}

// ─── Cierre de sesión ────────────────────────────────────────────────────────────────

type Resumen = {
  duracionMin: number | null;
  volumen: number;
  volumenPrev: number | null;
  prsNuevos: { nombre: string; kg: number; reps: number }[];
};

function volumenDe(ejercicios: EjercicioLog[]) {
  let v = 0;
  for (const e of ejercicios) {
    for (const s of e.sets) {
      const kg = typeof s.kg === "number" ? s.kg : 0;
      const reps = typeof s.reps === "number" ? s.reps : 0;
      if (kg > 0 && reps > 0) v += kg * reps;
    }
  }
  return v;
}

function DoneOverlay({ resumen, sesionNombre }: { resumen: Resumen; sesionNombre: string }) {
  const t = useT();
  const diff = resumen.volumenPrev != null ? resumen.volumen - resumen.volumenPrev : null;

  // El wrapper de la página tiene un transform residual (animate-fade-up con
  // fill "both"), que convierte a ese div en el contenedor de los `fixed`.
  // El portal saca el overlay a <body> para que ocupe el viewport real.
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
        <p className="mt-1 text-sm text-muted">{t(sesionNombre)}</p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="card-2 py-4">
            <div className="font-display text-2xl tabular-nums">
              {resumen.duracionMin != null ? `${resumen.duracionMin}′` : "—"}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{t("Duración")}</div>
          </div>
          <div className="card-2 py-4">
            <div className="font-display text-2xl tabular-nums">
              {Math.round(resumen.volumen).toLocaleString("es-ES")}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{t("kg movidos")}</div>
          </div>
        </div>

        {diff != null && diff !== 0 && (
          <p className={`mt-3 flex items-center justify-center gap-1 text-sm ${diff > 0 ? "text-good" : "text-muted"}`}>
            <TrendingUp size={15} />
            {diff > 0
              ? `+${Math.round(diff).toLocaleString("es-ES")} ${t("kg más que la última vez")}`
              : `${Math.round(diff).toLocaleString("es-ES")} ${t("kg vs la última vez")}`}
          </p>
        )}

        {resumen.prsNuevos.length > 0 && (
          <div className="mt-5 card border-accent/40 text-left">
            <div className="mb-2 flex items-center gap-2 font-medium text-accent">
              <Trophy size={16} /> {resumen.prsNuevos.length === 1 ? t("¡Nuevo récord!") : `${resumen.prsNuevos.length} ${t("récords nuevos")}`}
            </div>
            <div className="space-y-1.5">
              {resumen.prsNuevos.map((p) => (
                <div key={p.nombre} className="flex items-center justify-between text-sm">
                  <span className="pr-2">{t(p.nombre)}</span>
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

// Confetti en canvas: ráfagas con física (gravedad, rozamiento, giro 3D
// simulado) que explotan desde la zona del check. Se limpia solo al acabar.
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
          vy: Math.sin(ang) * v - speed * 0.55, // sesgo hacia arriba
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

    // Ráfaga principal desde el check + dos laterales escalonadas
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
        p.vy += 0.16;   // gravedad
        p.vx *= 0.985;  // rozamiento
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.globalAlpha = Math.min(1, (1 - p.life / p.ttl) * 1.6);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // "Volteo 3D": el ancho oscila como una tarjeta girando en el aire
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

  // h-full/w-full: inset-0 no estira elementos reemplazados como <canvas>
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

function Warmup({
  pasos,
  warm,
  setWarm,
  nota,
  duracion,
  allWarm,
  onStart,
}: {
  pasos: { ejercicio: string; detalle: string }[];
  warm: boolean[];
  setWarm: (f: (p: boolean[]) => boolean[]) => void;
  nota: string;
  duracion: string;
  allWarm: boolean;
  onStart: () => void;
}) {
  const t = useT();
  return (
    <div className="mt-5 animate-fade-up">
      <div className="mb-3 flex items-center gap-2 text-sm text-accent">
        <Flame size={16} /> {t("Calentamiento")} {duracion} · {t("obligatorio con tu lumbar")}
      </div>
      <div className="space-y-2">
        {pasos.map((p, i) => (
          <button
            key={i}
            onClick={() => setWarm((prev) => prev.map((b, j) => (j === i ? !b : b)))}
            className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
              warm[i] ? "border-accent/60 bg-accent-soft" : "border-line bg-surface"
            }`}
          >
            <span
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                warm[i] ? "border-accent bg-accent text-black" : "border-line"
              }`}
            >
              {warm[i] && <Check size={13} />}
            </span>
            <span>
              <span className="text-sm text-ink">{t(p.ejercicio)}</span>
              <span className="block text-xs text-muted">{t(p.detalle)}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-accent-soft p-3 text-xs text-muted">{t(nota)}</p>
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
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-arranque al registrar las reps de una serie
  useEffect(() => {
    if (auto && auto.secs > 0) {
      setSecs(auto.secs);
      setRunning(true);
    }
  }, [auto?.n]); // eslint-disable-line

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) {
            setRunning(false);
            restAlarm();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

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
            onClick={() => {
              setSecs(p);
              setRunning(true);
            }}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted active:scale-95"
          >
            {p}s
          </button>
        ))}
        <button
          onClick={() => setRunning((r) => !r)}
          className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-black"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => {
            setSecs(0);
            setRunning(false);
          }}
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
