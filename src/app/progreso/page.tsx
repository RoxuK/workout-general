"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import Link from "next/link";
import { Plus, Trash2, Trophy, Dumbbell, LineChart as LineChartIcon, Camera, X, Images, ClipboardCheck, ChevronRight, Pencil, Check } from "lucide-react";
import Header from "@/components/Header";
import { useActivePlan } from "@/lib/user-content";
import { useStore } from "@/lib/store";
import type { BodyLog } from "@/lib/types";
import { uid, dayKey, fmtDate, bestSet } from "@/lib/utils";
import { addPhoto, deletePhoto, listPhotos, resizeImage, type ProgressPhoto } from "@/lib/photos";
import { useT } from "@/lib/i18n";

export default function Progreso() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const plan = useActivePlan();

  const bodyLogs = useStore((s) => s.bodyLogs);
  const workouts = useStore((s) => s.workouts);
  const addBody = useStore((s) => s.addBody);
  const updateBody = useStore((s) => s.updateBody);
  const deleteBody = useStore((s) => s.deleteBody);
  const updateWorkout = useStore((s) => s.updateWorkout);
  const deleteWorkout = useStore((s) => s.deleteWorkout);
  const t = useT();
  const [editBodyId, setEditBodyId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selEx, setSelEx] = useState("");

  const chartData = useMemo(() => {
    if (!mounted) return [];
    const pts = bodyLogs
      .filter((b) => b.weight !== "")
      .map((b) => ({ t: new Date(b.date).getTime(), weight: Number(b.weight) }))
      .sort((a, b) => a.t - b.t)
      .map((p) => ({ ...p, date: fmtDate(new Date(p.t).toISOString()) }));
    // 7-day rolling average: smooths out water/glycogen noise, shows the real trend
    return pts.map((p) => {
      const window = pts.filter((q) => q.t <= p.t && q.t >= p.t - 7 * 86400000);
      const avg = window.reduce((a, q) => a + q.weight, 0) / window.length;
      return { date: p.date, weight: p.weight, avg: Math.round(avg * 10) / 10 };
    });
  }, [bodyLogs, mounted]);

  // Weekly tonnage (last 12 weeks with data)
  const weeklyVolume = useMemo(() => {
    if (!mounted) return [];
    const perWeek = new Map<string, number>();
    for (const w of workouts) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of that week
      const k = dayKey(d);
      let v = 0;
      for (const e of w.exercises)
        for (const s of e.sets) {
          const kg = typeof s.kg === "number" ? s.kg : 0;
          const reps = typeof s.reps === "number" ? s.reps : 0;
          if (kg > 0 && reps > 0) v += kg * reps;
        }
      perWeek.set(k, (perWeek.get(k) ?? 0) + v);
    }
    return Array.from(perWeek.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-12)
      .map(([k, v]) => ({ week: fmtDate(k + "T00:00:00"), kg: Math.round(v) }));
  }, [workouts, mounted]);

  // Strength PRs per exercise
  const prs = useMemo(() => {
    if (!mounted) return [];
    const m = new Map<string, { kg: number; reps: number; date: string }>();
    for (const w of workouts) {
      for (const e of w.exercises) {
        const b = bestSet(e.sets);
        if (!b) continue;
        const cur = m.get(e.name);
        if (!cur || b.kg > cur.kg || (b.kg === cur.kg && b.reps > cur.reps)) {
          m.set(e.name, { ...b, date: w.date });
        }
      }
    }
    return Array.from(m.entries()).sort((a, b) => b[1].kg - a[1].kg);
  }, [workouts, mounted]);

  // Weight series per exercise (best set of each session, in order)
  const exerciseSeries = useMemo(() => {
    const m: Record<string, { date: string; kg: number }[]> = {};
    if (!mounted) return m;
    const sorted = [...workouts].sort((a, b) => (a.date < b.date ? -1 : 1));
    for (const w of sorted) {
      for (const e of w.exercises) {
        const b = bestSet(e.sets);
        if (!b || b.kg <= 0) continue;
        (m[e.name] ||= []).push({ date: fmtDate(w.date), kg: b.kg });
      }
    }
    return m;
  }, [workouts, mounted]);

  const exercisesWithData = Object.keys(exerciseSeries).sort(
    (a, b) => exerciseSeries[b].length - exerciseSeries[a].length
  );
  const currentEx = selEx && exerciseSeries[selEx] ? selEx : exercisesWithData[0] || "";
  const exSeries = currentEx ? exerciseSeries[currentEx] : [];

  const last = mounted ? bodyLogs[0] : undefined;

  return (
    <div className="animate-fade-up">
      <Header
        eyebrow="Tu evolución"
        title="Progreso"
        right={
          <button onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full bg-accent text-black">
            <Plus size={20} className={open ? "rotate-45 transition" : "transition"} />
          </button>
        }
      />

      {open && <PesajeForm onSave={(b) => { addBody(b); setOpen(false); }} />}

      {!open && (
        <Link href="/checkin" className="mb-4 card-2 flex items-center justify-between">
          <span className="flex items-center gap-3">
            <ClipboardCheck size={18} className="text-accent" />
            <span>
              <span className="block text-sm">{t("Check-in semanal")}</span>
              <span className="block text-xs text-muted">{t("Peso, medidas y sensaciones en 2 minutos")}</span>
            </span>
          </span>
          <ChevronRight size={18} className="text-muted" />
        </Link>
      )}

      {/* Weight chart */}
      <div className="card">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">{t("Peso (kg)")}</span>
          <span className="text-xs text-muted">{t("meta")} {plan.targetWeight} kg</span>
        </div>
        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "var(--muted)" }} />
              <ReferenceLine y={plan.targetWeight} stroke="var(--good)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)" }} />
              <Line type="monotone" dataKey="avg" stroke="var(--warn)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted">
            {t("Registra al menos 2 pesajes para ver la curva.")}
          </p>
        )}
        {chartData.length >= 2 && (
          <p className="mt-1 text-[10px] text-muted">
            <span className="text-warn">— —</span> {t("tendencia (media 7 días): fíate de esta línea, no del pesaje del día.")}
          </p>
        )}
      </div>

      {/* Weekly volume */}
      {weeklyVolume.length >= 2 && (
        <div className="mt-4 card">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">{t("Volumen semanal (kg movidos)")}</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyVolume} margin={{ top: 6, right: 6, bottom: 0, left: -14 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "var(--accent-soft)" }}
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(v: any) => [`${Number(v).toLocaleString("en-GB")} kg`, "Volume"]}
              />
              <Bar dataKey="kg" fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[10px] text-muted">
            {t("Si baja varias semanas seguidas sin estar de deload, toca revisar el plan.")}
          </p>
        </div>
      )}

      {/* Latest measurements */}
      {last && (
        <div className="mt-4 card">
          <div className="label mb-2">{t("Últimas medidas ·")} {fmtDate(last.date)}</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Med v={last.weight} u="kg" l={t("Peso")} />
            <Med v={last.waist} u="cm" l={t("Cintura")} />
            <Med v={last.bodyFat} u="%" l={t("Grasa")} />
            <Med v={last.chest} u="cm" l={t("Pecho")} />
            <Med v={last.arm} u="cm" l={t("Brazo")} />
            <Med v={last.thigh} u="cm" l={t("Muslo")} />
          </div>
        </div>
      )}

      {/* Progress photos */}
      <PhotosSection />

      {/* PRs */}
      <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
        <Trophy size={18} className="text-accent" /> {t("Récords de fuerza")}
      </h2>
      {prs.length ? (
        <div className="card divide-y divide-line p-0">
          {prs.slice(0, 12).map(([name, pr]) => (
            <div key={name} className="flex items-center justify-between px-4 py-3">
              <span className="pr-2 text-sm">{t(name)}</span>
              <span className="shrink-0 font-display text-lg text-accent tabular-nums">
                {pr.kg}<span className="text-xs text-muted"> kg × {pr.reps}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="card text-center text-sm text-muted">{t("Aún sin entrenos registrados.")}</p>
      )}

      {/* Per-exercise progress */}
      {exercisesWithData.length > 0 && (
        <>
          <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
            <LineChartIcon size={18} className="text-accent" /> {t("Progreso por ejercicio")}
          </h2>
          <div className="card">
            <select
              value={currentEx}
              onChange={(e) => setSelEx(e.target.value)}
              className="input mb-3"
            >
              {exercisesWithData.map((n) => (
                <option key={n} value={n}>{t(n)}</option>
              ))}
            </select>
            {exSeries.length >= 2 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={exSeries} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "var(--muted)" }}
                    formatter={(v: any) => [`${v} kg`, t("Mejor set")]}
                  />
                  <Line type="monotone" dataKey="kg" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted">
                {t("Registra este ejercicio en 2+ sesiones para ver la curva.")}
              </p>
            )}
          </div>
        </>
      )}

      {/* History */}
      <h2 className="section-title mt-7 mb-3 text-xl flex items-center gap-2">
        <Dumbbell size={18} className="text-accent" /> {t("Historial")}
      </h2>
      {mounted && workouts.length ? (
        <div className="space-y-2">
          {workouts.map((w) => (
            <WorkoutRow
              key={w.id}
              w={w}
              onSave={(patch) => updateWorkout(w.id, patch)}
              onDelete={() => {
                if (confirm(`¿Borrar el entreno de ${w.sessionName} del ${fmtDate(w.date)}?`)) deleteWorkout(w.id);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="card text-center text-sm text-muted">{t("Tus entrenos aparecerán aquí.")}</p>
      )}

      {/* Recent weigh-ins */}
      {mounted && bodyLogs.length > 0 && (
        <details className="mt-4 card-2">
          <summary className="cursor-pointer list-none text-sm text-muted">{t("Ver pesajes registrados")} ({bodyLogs.length})</summary>
          <div className="mt-2 divide-y divide-line">
            {bodyLogs.map((b) =>
              editBodyId === b.id ? (
                <div key={b.id} className="py-2">
                  <PesajeForm
                    initial={b}
                    titulo={`${t("Editar pesaje")} · ${fmtDate(b.date)}`}
                    onSave={(nb) => { updateBody(b.id, nb); setEditBodyId(null); }}
                  />
                </div>
              ) : (
                <div key={b.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted">{fmtDate(b.date)}</span>
                  <span className="flex items-center gap-3">
                    <span>{b.weight !== "" ? `${b.weight} kg` : "—"}</span>
                    <button onClick={() => setEditBodyId(b.id)} className="text-muted" title="Editar"><Pencil size={14} /></button>
                    <button
                      onClick={() => { if (confirm(`¿Borrar el pesaje del ${fmtDate(b.date)}?`)) deleteBody(b.id); }}
                      className="text-muted"
                      title="Borrar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              )
            )}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── Editable workout row ──────────────────────────────────────────────────

function WorkoutRow({
  w,
  onSave,
  onDelete,
}: {
  w: import("@/lib/types").WorkoutLog;
  onSave: (patch: Partial<import("@/lib/types").WorkoutLog>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(w);
  const t = useT();

  function start() {
    // Deep copy of the sets so editing doesn't mutate the original
    setDraft({ ...w, exercises: w.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) });
    setEditing(true);
  }

  function setSet(ei: number, si: number, field: "kg" | "reps", value: string) {
    setDraft((d) => {
      const next = { ...d, exercises: d.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) };
      next.exercises[ei].sets[si][field] = (value === "" ? "" : Number(value)) as never;
      return next;
    });
  }

  if (!editing) {
    return (
      <div className="card-2 flex items-center justify-between">
        <div>
          <div className="font-medium">{t(w.sessionName)}</div>
          <div className="text-xs text-muted">
            {fmtDate(w.date)} · RPE {w.rpe ?? "—"} · {t("lumbar")} {w.lowerBack ?? "—"}/5
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button onClick={start} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted" title={t("Editar")}>
            <Pencil size={15} />
          </button>
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted" title={t("Borrar")}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-accent/40 animate-fade-up">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-medium">{t(w.sessionName)}</div>
          <div className="text-xs text-muted">{fmtDate(w.date)} · {t("corrigiendo registro")}</div>
        </div>
        <button onClick={() => setEditing(false)} className="text-xs text-muted underline">{t("Cancelar")}</button>
      </div>

      <div className="space-y-3">
        {draft.exercises.map((e, ei) => (
          <div key={ei}>
            <div className="mb-1 text-xs text-muted">{t(e.name)}</div>
            <div className="space-y-1.5">
              {e.sets.map((s, si) => (
                <div key={si} className="flex items-center gap-2">
                  <span className="w-5 text-center text-[11px] text-muted">{si + 1}</span>
                  <input
                    type="number" inputMode="decimal" placeholder="kg" value={s.kg}
                    onChange={(ev) => setSet(ei, si, "kg", ev.target.value)}
                    className="input py-1.5 text-center text-sm tabular-nums"
                  />
                  <span className="text-muted">×</span>
                  <input
                    type="number" inputMode="numeric" placeholder="reps" value={s.reps}
                    onChange={(ev) => setSet(ei, si, "reps", ev.target.value)}
                    className="input py-1.5 text-center text-sm tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-muted">{t("RPE (1-10)")}</span>
          <input
            type="number" min={1} max={10} value={draft.rpe ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, rpe: e.target.value === "" ? null : Number(e.target.value) }))}
            className="input mt-0.5 text-center tabular-nums"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted">{t("Lumbar (1-5)")}</span>
          <input
            type="number" min={1} max={5} value={draft.lowerBack ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, lowerBack: e.target.value === "" ? null : Number(e.target.value) }))}
            className="input mt-0.5 text-center tabular-nums"
          />
        </label>
      </div>
      <input
        className="input mt-2 text-sm"
        placeholder={t("Notas")}
        value={draft.notes}
        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
      />

      <button
        onClick={() => { onSave({ exercises: draft.exercises, rpe: draft.rpe, lowerBack: draft.lowerBack, notes: draft.notes }); setEditing(false); }}
        className="btn-accent mt-3 w-full gap-1"
      >
        <Check size={16} /> {t("Guardar cambios")}
      </button>
    </div>
  );
}

// ─── Progress photos ───────────────────────────────────────────────────────────────────

function PhotosSection() {
  const t = useT();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string[]>([]); // up to 2 ids to compare
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const list = await listPhotos();
      setPhotos(list);
    } catch {
      // IndexedDB unavailable (old private mode): empty section
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Object URLs for the blobs, cleaned up when the list changes
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const p of photos) next[p.id] = URL.createObjectURL(p.blob);
    setUrls(next);
    return () => {
      for (const u of Object.values(next)) URL.revokeObjectURL(u);
    };
  }, [photos]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeImage(file);
      await addPhoto({ id: uid(), date: new Date().toISOString(), blob });
      await refresh();
    } catch {
      alert("No se pudo guardar la foto.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta foto?")) return;
    await deletePhoto(id);
    setSel((s) => s.filter((x) => x !== id));
    await refresh();
  }

  function toggleSel(id: string) {
    setSel((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]
    );
  }

  const comparing = sel.length === 2 ? sel.map((id) => photos.find((p) => p.id === id)!).filter(Boolean) : [];

  return (
    <>
      <h2 className="section-title mt-7 mb-1 text-xl flex items-center gap-2">
        <Camera size={18} className="text-accent" /> {t("Fotos de progreso")}
      </h2>
      <p className="mb-3 text-xs text-muted">
        {t("Frontal y lateral, misma luz y misma pose. Nunca salen de tu teléfono (no entran en el backup .json).")}
      </p>

      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
      <button onClick={() => fileRef.current?.click()} disabled={busy} className="btn-ghost w-full gap-2">
        <Camera size={16} className="text-accent" /> {busy ? t("Guardando…") : t("Añadir foto de hoy")}
      </button>

      {/* Comparison */}
      {comparing.length === 2 && (
        <div className="mt-3 card animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <span className="label flex items-center gap-1"><Images size={13} /> {t("Comparativa")}</span>
            <button onClick={() => setSel([])} className="text-muted"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {comparing.map((p) => (
              <figure key={p.id}>
                <img src={urls[p.id]} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
                <figcaption className="mt-1 text-center text-[10px] text-muted">{fmtDate(p.date)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <>
          <p className="mt-3 mb-1 text-[11px] text-muted">{t("Toca dos fotos para compararlas.")}</p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => {
              const marked = sel.includes(p.id);
              return (
                <div key={p.id} className="relative">
                  <button
                    onClick={() => toggleSel(p.id)}
                    className={`block w-full overflow-hidden rounded-xl border transition ${
                      marked ? "border-accent" : "border-line"
                    }`}
                  >
                    <img src={urls[p.id]} alt="" className="aspect-[3/4] w-full object-cover" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                    {fmtDate(p.date)}
                  </span>
                  <button
                    onClick={() => remove(p.id)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function Med({ v, u, l }: { v: number | ""; u: string; l: string }) {
  return (
    <div className="card-2 py-2">
      <div className="font-display text-xl">{v !== "" ? v : "—"}<span className="text-xs text-muted"> {u}</span></div>
      <div className="text-[10px] text-muted">{l}</div>
    </div>
  );
}

function PesajeForm({
  onSave,
  initial,
  titulo,
}: {
  onSave: (b: BodyLog) => void;
  initial?: BodyLog;
  titulo?: string;
}) {
  const t = useT();
  const [f, setF] = useState<BodyLog>(
    initial ?? {
      id: uid(),
      date: new Date().toISOString(),
      weight: "",
      waist: "",
      hip: "",
      chest: "",
      arm: "",
      thigh: "",
      bodyFat: "",
      muscleMass: "",
      visceralFat: "",
      water: "",
      notes: "",
    }
  );
  const set = (k: keyof BodyLog, v: string) =>
    setF((p) => ({ ...p, [k]: v === "" ? "" : k === "notes" ? v : Number(v) }));

  return (
    <div className="mb-4 card animate-fade-up">
      <div className="label mb-2">{titulo ?? `${t("Nuevo pesaje ·")} ${fmtDate(f.date)}`}</div>
      <div className="grid grid-cols-2 gap-2">
        <Field l={t("Peso (kg)")} v={f.weight} onChange={(v) => set("weight", v)} />
        <Field l={t("Cintura (cm)")} v={f.waist} onChange={(v) => set("waist", v)} />
        <Field l={t("% Grasa")} v={f.bodyFat} onChange={(v) => set("bodyFat", v)} />
        <Field l={t("Pecho (cm)")} v={f.chest} onChange={(v) => set("chest", v)} />
        <Field l={t("Brazo (cm)")} v={f.arm} onChange={(v) => set("arm", v)} />
        <Field l={t("Muslo (cm)")} v={f.thigh} onChange={(v) => set("thigh", v)} />
      </div>
      <details className="mt-2" open={!!(f.muscleMass || f.visceralFat || f.water)}>
        <summary className="cursor-pointer list-none text-xs text-accent">
          {t("+ Datos de la báscula (opcional)")}
        </summary>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Field l={t("Músculo (kg)")} v={f.muscleMass ?? ""} onChange={(v) => set("muscleMass", v)} />
          <Field l={t("G. visceral")} v={f.visceralFat ?? ""} onChange={(v) => set("visceralFat", v)} />
          <Field l={t("% Agua")} v={f.water ?? ""} onChange={(v) => set("water", v)} />
        </div>
      </details>
      <input className="input mt-2" placeholder={t("Notas / sensaciones")} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      <button onClick={() => onSave(f)} className="btn-accent mt-3 w-full">{initial ? t("Guardar cambios") : t("Guardar pesaje")}</button>
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
