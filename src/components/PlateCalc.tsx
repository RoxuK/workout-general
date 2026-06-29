"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Disc3, X } from "lucide-react";
import { useT } from "@/lib/i18n";

// Discos estándar por lado (kg). Si tu gym no tiene alguno, el resultado
// sigue siendo válido combinando los siguientes.
const DISCOS = [25, 20, 15, 10, 5, 2.5, 1.25];
const BARRAS = [
  { id: 20, label: "Barra olímpica · 20 kg" },
  { id: 15, label: "Barra media · 15 kg" },
  { id: 10, label: "Barra EZ / corta · 10 kg" },
];

function calcular(objetivo: number, barra: number) {
  const porLado = (objetivo - barra) / 2;
  if (porLado < 0) return { discos: [], resto: porLado, porLado };
  let resto = porLado;
  const discos: number[] = [];
  for (const d of DISCOS) {
    while (resto >= d - 0.001) {
      discos.push(d);
      resto = +(resto - d).toFixed(2);
    }
  }
  return { discos, resto, porLado };
}

const fmtKg = (n: number) => n.toLocaleString("es-ES");

export default function PlateCalc() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [kg, setKg] = useState("");
  const [barra, setBarra] = useState(20);

  const objetivo = parseFloat(kg.replace(",", "."));
  const res = useMemo(
    () => (objetivo > 0 ? calcular(objetivo, barra) : null),
    [objetivo, barra]
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Calculadora de discos"
        className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted active:scale-95"
      >
        <Disc3 size={16} />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-app rounded-t-2xl border border-line bg-surface p-4 pb-8 sm:rounded-2xl animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-xl">
                  <Disc3 size={18} className="text-accent" /> {t("¿Qué discos pongo?")}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted"
                >
                  <X size={18} />
                </button>
              </div>

              <label className="block">
                <span className="text-[11px] text-muted">{t("Peso total que quieres levantar (kg)")}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder="p. ej. 42,5"
                  className="input mt-1 text-center font-display text-2xl tabular-nums"
                />
              </label>

              <div className="mt-3 flex gap-2">
                {BARRAS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBarra(b.id)}
                    className={`flex-1 rounded-xl border px-2 py-2 text-xs transition ${
                      barra === b.id
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line text-muted"
                    }`}
                  >
                    {t(b.label).split("·")[0].trim()}
                    <span className="block text-[10px] opacity-70">{b.id} kg</span>
                  </button>
                ))}
              </div>

              {res && (
                <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3 text-center">
                  {res.porLado < 0 ? (
                    <p className="text-sm text-muted">
                      {t("El objetivo pesa menos que la barra: usa una barra más ligera o mancuernas.")}
                    </p>
                  ) : res.discos.length === 0 ? (
                    <p className="text-sm text-muted">{t("Solo la barra, sin discos. 🙂")}</p>
                  ) : (
                    <>
                      <div className="label mb-2">{t("Por cada lado")}</div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {res.discos.map((d, i) => (
                          <span
                            key={i}
                            className="grid place-items-center rounded-full border-2 border-accent bg-accent-soft font-display tabular-nums text-accent"
                            style={{
                              width: `${Math.max(34, Math.min(56, 26 + d))}px`,
                              height: `${Math.max(34, Math.min(56, 26 + d))}px`,
                              fontSize: d < 5 ? "10px" : "13px",
                            }}
                          >
                            {fmtKg(d)}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {fmtKg(barra)} {t("kg barra")} + 2 × {fmtKg(res.porLado - res.resto)} kg ={" "}
                        <span className="text-ink">{fmtKg(barra + 2 * (res.porLado - res.resto))} kg</span>
                      </p>
                      {res.resto > 0.01 && (
                        <p className="mt-1 text-[11px] text-warn">
                          {t("Faltan")} {fmtKg(res.resto)} {t("kg por lado que no salen con discos estándar — ese es el peso alcanzable más cercano por abajo.")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
