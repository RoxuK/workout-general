"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Timer, Play, Pause, RotateCcw, X } from "lucide-react";
import { useStore } from "@/lib/store";
import PlateCalc from "@/components/PlateCalc";

export function restAlarm() {
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

// Shared clock for the global rest timer. The store only holds a real-clock
// deadline (endAt) or the paused remainder; the remaining seconds are always
// recomputed from Date.now(), so background throttling or navigating between
// tabs can't desync it. Exactly ONE component with this hook is mounted at a
// time (the session bar on the player page, the floating pill elsewhere), so
// the end-of-timer alarm fires once.
export function useRestClock() {
  const rest = useStore((s) => s.rest);
  const resetRest = useStore((s) => s.resetRest);
  const running = rest.endAt != null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick(); // corrects immediately, covers returning from the background
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running]);

  const secs = rest.endAt != null
    ? Math.max(0, Math.round((rest.endAt - now) / 1000))
    : rest.pausedLeft ?? 0;

  useEffect(() => {
    if (rest.endAt == null || secs > 0) return;
    // Silent reset for a deadline long past (e.g. a timer rehydrated from a
    // previous session) — only ring if it just finished.
    if (Date.now() - rest.endAt < 30000) restAlarm();
    resetRest();
  }, [rest.endAt, secs, resetRest]);

  return { secs, running: running && secs > 0, paused: rest.pausedLeft != null };
}

export function fmtSecs(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

// Full control bar shown inside the workout player (sticky at the top).
export function RestTimerBar() {
  const presets = [45, 60, 90];
  const startRest = useStore((s) => s.startRest);
  const pauseRest = useStore((s) => s.pauseRest);
  const resumeRest = useStore((s) => s.resumeRest);
  const resetRest = useStore((s) => s.resetRest);
  const { secs, running, paused } = useRestClock();
  // The store rehydrates from localStorage before React mounts, so the first
  // client render could differ from the server HTML — render 0:00 until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const shown = mounted ? secs : 0;

  return (
    <div className="sticky top-2 z-30 mt-4">
      {mounted && running && <span className="halo-dot" />}
      <div className="relative flex items-center justify-between rounded-2xl border border-line bg-surface-2/90 p-2 backdrop-blur">
        <div className="flex items-center gap-2 pl-1">
          <Timer size={18} className="text-accent" />
          <span className="font-display text-2xl tabular-nums">{fmtSecs(shown)}</span>
        </div>
        <div className="flex items-center gap-1">
          <PlateCalc />
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => startRest(p)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted active:scale-95"
            >
              {p}s
            </button>
          ))}
          <button
            onClick={() => (running ? pauseRest() : paused ? resumeRest() : undefined)}
            className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-black"
          >
            {mounted && running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={resetRest}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Floating mini-timer, mounted in the layout: while the rest timer is alive
// it stays visible above every other page, so leaving the workout screen
// doesn't hide (or kill) the countdown. Hidden on the player page itself,
// which already shows the full bar.
export default function FloatingRestTimer() {
  const pathname = usePathname();
  const rest = useStore((s) => s.rest);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const active = rest.endAt != null || rest.pausedLeft != null;
  // /entreno/[sesion] renders RestTimerBar — don't double-mount the clock there
  const onPlayer = /^\/entreno\/./.test(pathname ?? "");
  if (!mounted || !active || onPlayer) return null;
  return <FloatingPill />;
}

function FloatingPill() {
  const pauseRest = useStore((s) => s.pauseRest);
  const resumeRest = useStore((s) => s.resumeRest);
  const resetRest = useStore((s) => s.resetRest);
  const draft = useStore((s) => s.workoutDraft);
  const { secs, running, paused } = useRestClock();
  if (secs <= 0 && !paused) return null;

  const time = (
    <span className="flex items-center gap-2">
      <Timer size={16} className="text-accent" />
      <span className="font-display text-xl tabular-nums">{fmtSecs(secs)}</span>
    </span>
  );

  return (
    <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
      <div className="relative flex items-center gap-2 rounded-full border border-line bg-surface-2/95 py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur">
        {running && <span className="halo-dot" />}
        {draft ? (
          <Link href={`/entreno/${draft.sessionId}`} className="active:scale-95">
            {time}
          </Link>
        ) : (
          time
        )}
        <button
          onClick={() => (running ? pauseRest() : resumeRest())}
          className="grid h-8 w-8 place-items-center rounded-full bg-accent text-black"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={resetRest}
          className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
