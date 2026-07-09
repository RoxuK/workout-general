"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { notifSupported, scheduleReminders, scheduleInAppFallback } from "@/lib/reminders";
import { syncPushSubscription } from "@/lib/push-client";

// Reprograma los recordatorios cada vez que se abre la app (los triggers
// solo cubren unos días por adelantado). Donde no hay triggers (Chrome los
// retiró), programa la próxima ocurrencia con setTimeout como red de
// seguridad mientras la app está abierta, y sincroniza la suscripción push +
// recordatorios con el servidor, que es quien realmente dispara los avisos
// con la app cerrada.
export default function ReminderScheduler() {
  const reminders = useStore((s) => s.reminders);
  useEffect(() => {
    if (notifSupported() && Notification.permission === "granted") {
      const t = setTimeout(() => scheduleReminders(reminders), 1500);
      const fallback = scheduleInAppFallback(reminders);
      syncPushSubscription(reminders);
      return () => {
        clearTimeout(t);
        fallback.forEach(clearTimeout);
      };
    }
  }, [reminders]);
  return null;
}
