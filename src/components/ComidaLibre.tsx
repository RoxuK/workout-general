"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, Hand, Minus, Plus, UtensilsCrossed, X, Zap } from "lucide-react";
import { FREE_MEALS } from "@/lib/content";
import { useStore } from "@/lib/store";
import { dayKey, uid } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Tab = "catalog" | "hand" | "quick";

export default function ComidaLibreButton() {
  const [open, setOpen] = useState(false);
  const tr = useT();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-ghost mt-3 w-full gap-2 text-sm"
      >
        <UtensilsCrossed size={15} className="text-accent" /> {tr("Añadir comida libre")}
      </button>
      {open && <Sheet onClose={() => setOpen(false)} />}
    </>
  );
}

function Sheet({ onClose }: { onClose: () => void }) {
  const C = FREE_MEALS as any;
  const today = dayKey();
  const tr = useT();
  const addFreeMeal = useStore((s) => s.addFreeMeal);

  const [tab, setTab] = useState<Tab>("catalog");
  const [size, setSize] = useState("M");
  const [added, setAdded] = useState("");

  function add(name: string, kcal: number, p: number, c: number, g: number) {
    addFreeMeal(today, {
      id: uid(),
      name,
      kcal: Math.round(kcal),
      p: Math.round(p),
      c: Math.round(c),
      g: Math.round(g),
    });
    setAdded(name);
    setTimeout(() => setAdded(""), 1400);
  }

  const factor = (C.sizes as any[]).find((t) => t.id === size)?.factor ?? 1;
  const sizeLabel = (C.sizes as any[]).find((t) => t.id === size)?.label ?? "Normal";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-app flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 pb-0">
          <div>
            <h3 className="font-display text-xl leading-tight">{tr(C.title)}</h3>
            <p className="mt-1 text-[11px] text-muted">{tr(C.subtitle)}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 pb-2">
          <TabBtn on={tab === "catalog"} onClick={() => setTab("catalog")} label={tr("Catálogo")} />
          <TabBtn on={tab === "hand"} onClick={() => setTab("hand")} label={tr("A ojo ✋")} />
          <TabBtn on={tab === "quick"} onClick={() => setTab("quick")} label={tr("Rápido")} />
        </div>

        {/* Added notice */}
        {added && (
          <div className="mx-4 mb-1 flex items-center gap-2 rounded-xl border border-good/40 bg-good/10 px-3 py-2 text-xs text-good animate-fade-up">
            <Check size={14} /> {tr(added)} {tr("añadido a hoy")}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-2">
          {tab === "catalog" && (
            <>
              <div className="mb-3 flex gap-2">
                {(C.sizes as any[]).map((tt) => (
                  <button
                    key={tt.id}
                    onClick={() => setSize(tt.id)}
                    className={`flex-1 rounded-xl border py-2 text-xs transition ${
                      size === tt.id ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                    }`}
                  >
                    {tr(tt.label)}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                {(C.items as any[]).map((it) => (
                  <button
                    key={it.id}
                    onClick={() =>
                      add(
                        `${it.name}${size !== "M" ? ` (${sizeLabel.toLowerCase()})` : ""}`,
                        it.kcal * factor, it.p * factor, it.c * factor, it.g * factor
                      )
                    }
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-left transition active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="text-xl">{it.emoji}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{tr(it.name)}</span>
                        <span className="block text-[10px] text-muted">
                          {Math.round(it.p * factor)}P / {Math.round(it.c * factor)}C / {Math.round(it.g * factor)}G
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display tabular-nums text-accent">{Math.round(it.kcal * factor)}</span>
                      <span className="block text-[9px] text-muted">kcal</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted">{tr(C.note)}</p>
            </>
          )}

          {tab === "hand" && <HandEstimator onAdd={add} />}

          {tab === "quick" && (
            <div className="space-y-2">
              <p className="mb-2 text-[11px] text-muted">
                {tr("Para días de cero ganas de pensar: un registro aproximado vale más que ninguno.")}
              </p>
              {(C.genericOptions as any[]).map((gItem) => (
                <button
                  key={gItem.id}
                  onClick={() => add(gItem.name, gItem.kcal, gItem.p, gItem.c, gItem.g)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-3 text-left transition active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2.5">
                    <Zap size={16} className="shrink-0 text-accent" />
                    <span>
                      <span className="block text-sm">{tr(gItem.name)}</span>
                      <span className="block text-[10px] text-muted">{tr(gItem.detail)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-display tabular-nums text-accent">{gItem.kcal} <span className="text-[10px] text-muted">kcal</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TabBtn({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full border px-3 py-1.5 text-xs transition ${
        on ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
      }`}
    >
      {label}
    </button>
  );
}

// Hand-portion estimator: the method coaches use when there's no scale around
function HandEstimator({
  onAdd,
}: {
  onAdd: (name: string, kcal: number, p: number, c: number, g: number) => void;
}) {
  const C = FREE_MEALS as any;
  const tr = useT();
  const portions = C.handPortions.portions as any[];
  const [counts, setCounts] = useState<Record<string, number>>({ palm: 1, fist: 1, thumb: 1 });
  const [name, setName] = useState("");

  const total = portions.reduce(
    (acc, r) => {
      const n = counts[r.id] ?? 0;
      return { kcal: acc.kcal + r.kcal * n, p: acc.p + r.p * n, c: acc.c + r.c * n, g: acc.g + r.g * n };
    },
    { kcal: 0, p: 0, c: 0, g: 0 }
  );

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted">{tr(C.handPortions.intro)}</p>
      <div className="space-y-2">
        {portions.map((r) => {
          const n = counts[r.id] ?? 0;
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="text-xl">{r.emoji}</span>
                <span className="min-w-0">
                  <span className="block text-sm">{tr(r.label)}</span>
                  <span className="block text-[10px] leading-tight text-muted">{tr(r.detail)}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Stepper n={n} set={(v) => setCounts((c) => ({ ...c, [r.id]: v }))} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-accent/40 bg-accent-soft p-3 text-center">
        <span className="font-display text-2xl tabular-nums text-accent">{Math.round(total.kcal)}</span>
        <span className="ml-1 text-xs text-muted">kcal</span>
        <div className="mt-0.5 text-[11px] text-muted">
          {Math.round(total.p)}P / {Math.round(total.c)}C / {Math.round(total.g)}G
        </div>
      </div>

      <input
        className="input mt-3 text-sm"
        placeholder={tr("¿Qué era? (opcional, p. ej. «curry del tailandés»)")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        onClick={() => onAdd(name.trim() || "Comida estimada a ojo", total.kcal, total.p, total.c, total.g)}
        disabled={total.kcal <= 0}
        className="btn-accent mt-2 w-full gap-2"
      >
        <Hand size={16} /> {tr("Añadir a hoy")}
      </button>
    </div>
  );
}

function Stepper({ n, set }: { n: number; set: (v: number) => void }) {
  return (
    <span className="flex items-center gap-1">
      <button
        onClick={() => set(Math.max(0, n - 1))}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted active:scale-95"
      >
        <Minus size={13} />
      </button>
      <span className="w-6 text-center font-display text-lg tabular-nums">{n}</span>
      <button
        onClick={() => set(Math.min(9, n + 1))}
        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-accent active:scale-95"
      >
        <Plus size={13} />
      </button>
    </span>
  );
}
