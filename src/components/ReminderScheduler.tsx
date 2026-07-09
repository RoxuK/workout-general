"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { notifSupported, scheduleReminders, scheduleInAppFallback } from "@/lib/reminders";

// Reprograma los recordatorios cada vez que se abre la app (los triggers
// solo cubren unos días por adelantado). Donde no hay triggers (Chrome los
// retiró), programa la próxima ocurrencia con setTimeout: suena mientras la
// app siga abierta.
export default function ReminderScheduler() {
  const reminders = useStore((s) => s.reminders);
  useEffect(() => {
    if (notifSupported() && Notification.permission === "granted") {
      const t = setTimeout(() => scheduleReminders(reminders), 1500);
      const fallback = scheduleInAppFallback(reminders);
      return () => {
        clearTimeout(t);
        fallback.forEach(clearTimeout);
      };
    }
  }, [reminders]);
  return null;
}
