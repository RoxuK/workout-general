"use client";

import type { Reminder } from "./types";

export function notifSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

// Notificaciones programadas en segundo plano (Notification Triggers API).
// Soporte real sobre todo en Chrome/Edge Android con la PWA instalada.
export function triggersSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "showTrigger" in (Notification.prototype as any)
  );
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!notifSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function nextOccurrences(time: string, weekday?: number | null): number[] {
  const [h, m] = time.split(":").map(Number);
  const out: number[] = [];
  const now = Date.now();
  // Diarios: 7 días vista. Semanales: 28 días (≈4 avisos); se reprograman al abrir la app.
  const days = weekday == null ? 7 : 28;
  for (let d = 0; d < days; d++) {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(h, m, 0, 0);
    if (weekday != null && t.getDay() !== weekday) continue;
    if (t.getTime() > now) out.push(t.getTime());
  }
  return out;
}

// Programa (o reprograma) todos los recordatorios activos para los próximos días.
export async function scheduleReminders(reminders: Reminder[]) {
  if (!notifSupported() || Notification.permission !== "granted") {
    return { ok: false, reason: "permission" as const };
  }
  if (!triggersSupported()) {
    return { ok: false, reason: "unsupported" as const };
  }
  const reg = await navigator.serviceWorker.ready;

  // Limpia las notificaciones programadas previas de recordatorios.
  try {
    const pending = await (reg as any).getNotifications({ includeTriggered: false });
    pending.filter((n: Notification) => n.tag?.startsWith("rem-")).forEach((n: Notification) => n.close());
  } catch {}

  for (const r of reminders) {
    if (!r.enabled) continue;
    for (const ts of nextOccurrences(r.time, r.weekday)) {
      const date = new Date(ts).toISOString().slice(0, 10);
      try {
        await reg.showNotification(r.label, {
          tag: `rem-${r.id}-${date}`,
          body: r.body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          // showTrigger no está en los tipos estándar (el cast de abajo lo cubre)
          showTrigger: new (window as any).TimestampTrigger(ts),
          data: { url: r.url ?? "/" },
        } as NotificationOptions);
      } catch {}
    }
  }
  return { ok: true as const };
}

export async function testNotification() {
  if (!notifSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("Roxu · Entreno", {
    body: "¡Las notificaciones funcionan! 💪",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
  return true;
}
