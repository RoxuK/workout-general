"use client";

import type { Reminder } from "./types";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Subscribes this device to Web Push (idempotent — the browser returns the
// existing subscription if there is one) and syncs it + the current
// reminders to the server, which is what actually fires notifications while
// the app is closed. Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY at build time.
export async function syncPushSubscription(reminders: Reminder[]): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!pushSupported() || !vapidKey || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), reminders, timezone }),
    });
    return true;
  } catch {
    return false;
  }
}
