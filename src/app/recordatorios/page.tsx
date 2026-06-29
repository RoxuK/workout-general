"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, Send, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import {
  notifSupported,
  triggersSupported,
  requestNotifPermission,
  scheduleReminders,
  testNotification,
} from "@/lib/reminders";

// getDay() de JS: 0=domingo … 6=sábado
const DIAS = [
  { dia: 1, label: "L" }, { dia: 2, label: "M" }, { dia: 3, label: "X" },
  { dia: 4, label: "J" }, { dia: 5, label: "V" }, { dia: 6, label: "S" }, { dia: 0, label: "D" },
];

export default function Recordatorios() {
  const [mounted, setMounted] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [msg, setMsg] = useState("");
  const reminders = useStore((s) => s.reminders);
  const updateReminder = useStore((s) => s.updateReminder);
  const t = useT();

  useEffect(() => {
    setMounted(true);
    if (notifSupported()) setPerm(Notification.permission);
  }, []);

  async function activar() {
    const p = await requestNotifPermission();
    setPerm(p);
    if (p === "granted") {
      const res = await scheduleReminders(reminders);
      flash(res.ok ? t("Notificaciones activadas y programadas") : t("Activadas (este navegador puede no soportar avisos en segundo plano)"));
    } else {
      flash(t("Permiso denegado. Actívalo en los ajustes del navegador."));
    }
  }

  async function reprogramar(next = reminders) {
    if (perm === "granted") await scheduleReminders(next);
  }

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(""), 2600);
  }

  const supported = mounted && notifSupported();
  const bg = mounted && triggersSupported();

  return (
    <div className="animate-fade-up">
      <Header eyebrow="Notificaciones" title="Recordatorios" back="/ajustes" />

      {msg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-good/40 bg-good/10 p-3 text-sm text-good">
          <Check size={16} /> {msg}
        </div>
      )}

      {!supported ? (
        <div className="card flex items-center gap-2 text-sm text-muted">
          <BellOff size={18} /> {t("Tu navegador no soporta notificaciones. Instala la app en la pantalla de inicio y usa Chrome en Android.")}
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-accent" />
              <span className="text-sm">
                {perm === "granted" ? t("Notificaciones activadas") : t("Notificaciones desactivadas")}
              </span>
            </div>
            {perm !== "granted" ? (
              <button onClick={activar} className="btn-accent px-3 py-2 text-xs">{t("Activar")}</button>
            ) : (
              <button onClick={async () => { (await testNotification()) ? flash(t("Enviada 🎉")) : flash(t("No se pudo enviar")); }} className="btn-ghost gap-1 px-3 py-2 text-xs">
                <Send size={14} /> {t("Probar")}
              </button>
            )}
          </div>
          {perm === "granted" && !bg && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-muted">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
              {t("Este navegador no permite avisos programados en segundo plano. Los recordatorios funcionan mejor con la PWA instalada en Chrome/Android.")}
            </div>
          )}
        </div>
      )}

      <h2 className="section-title mt-7 mb-3 text-xl">{t("Tus recordatorios")}</h2>
      <div className="space-y-2">
        {(mounted ? reminders : []).map((r) => (
          <div key={r.id} className="card-2">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => { updateReminder(r.id, { enabled: !r.enabled }); reprogramar(reminders.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x)); }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{t(r.label)}</span>
                  <span className="block truncate text-xs text-muted">{t(r.body)}</span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) => { updateReminder(r.id, { time: e.target.value }); }}
                  onBlur={() => reprogramar()}
                  disabled={!r.enabled}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm tabular-nums outline-none focus:border-accent disabled:opacity-40"
                />
                <span className={`h-5 w-9 rounded-full p-0.5 transition ${r.enabled ? "bg-accent" : "bg-surface"}`}
                  onClick={() => { updateReminder(r.id, { enabled: !r.enabled }); reprogramar(reminders.map((x) => x.id === r.id ? { ...x, enabled: !x.enabled } : x)); }}>
                  <span className={`block h-4 w-4 rounded-full bg-black transition ${r.enabled ? "translate-x-4" : ""}`} />
                </span>
              </div>
            </div>

            {/* Recordatorios semanales: tú eliges el día */}
            {r.weekday != null && (
              <div className={`mt-2.5 flex gap-1 border-t border-line pt-2.5 ${r.enabled ? "" : "opacity-40"}`}>
                {DIAS.map((d) => (
                  <button
                    key={d.dia}
                    disabled={!r.enabled}
                    onClick={() => {
                      updateReminder(r.id, { weekday: d.dia });
                      reprogramar(reminders.map((x) => x.id === r.id ? { ...x, weekday: d.dia } : x));
                    }}
                    className={`flex-1 rounded-lg border py-1.5 text-[11px] transition ${
                      r.weekday === d.dia ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted">
        {t("Los horarios de suplementos siguen el protocolo de la sección de Suplementación. Ajústalos a tu rutina.")}
      </p>
    </div>
  );
}
