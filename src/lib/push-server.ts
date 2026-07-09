import { put, head } from "@vercel/blob";
import type { Reminder } from "./types";

// Server-side state for background push reminders, persisted as a single
// JSON blob (this is a single-user personal app — no need for a database).
// Multiple devices can each hold a push subscription; reminders + timezone
// are last-write-wins from whichever device last opened the app.
const STATE_KEY = "push-state.json";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type PushState = {
  subscriptions: PushSubscriptionJSON[];
  reminders: Reminder[];
  timezone: string; // IANA name, e.g. "Europe/Madrid"
  lastSent: Record<string, string>; // reminder id -> date-key (YYYY-MM-DD) already notified
};

const EMPTY_STATE: PushState = { subscriptions: [], reminders: [], timezone: "Europe/Madrid", lastSent: {} };

export async function readPushState(): Promise<PushState> {
  try {
    const info = await head(STATE_KEY);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return EMPTY_STATE;
    const data = await res.json();
    return { ...EMPTY_STATE, ...data };
  } catch {
    return EMPTY_STATE; // no blob written yet
  }
}

export async function writePushState(state: PushState): Promise<void> {
  await put(STATE_KEY, JSON.stringify(state), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
