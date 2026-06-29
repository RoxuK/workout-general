"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { notifSupported, scheduleReminders } from "@/lib/reminders";

// Reprograma los recordatorios cada vez que se abre la app (los triggers
// solo cubren unos días por adelantado).
export default function ReminderScheduler() {
  const reminders = useStore((s) => s.reminders);
  useEffect(() => {
    if (notifSupported() && Notification.permission === "granted") {
      const t = setTimeout(() => scheduleReminders(reminders), 1500);
      return () => clearTimeout(t);
    }
  }, [reminders]);
  return null;
}
