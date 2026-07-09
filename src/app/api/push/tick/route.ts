import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { readPushState, writePushState, type PushSubscriptionJSON } from "@/lib/push-server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Reminder times are wall-clock in the user's timezone; recompute "now" in
// that same timezone (rather than trusting the cron's UTC clock) so DST
// shifts don't drift the fire time — Node's Intl has full ICU on Vercel.
function nowParts(timezone: string, at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: parseInt(hour, 10) * 60 + parseInt(get("minute"), 10),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

// Called every few minutes by an external cron (see /recordatorios for the
// setup URL). ponytail: no per-minute precision guarantee — "due" means
// within ±4 min of the target, wide enough to survive a 5-min cron cadence
// without double-firing (guarded separately by `lastSent`).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:example@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const state = await readPushState();
  if (!state.subscriptions.length || !state.reminders.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const now = new Date();
  const { dateKey, minutes, weekday } = nowParts(state.timezone, now);

  const due = state.reminders.filter((r) => {
    if (!r.enabled) return false;
    if (r.weekday != null && r.weekday !== weekday) return false;
    if (state.lastSent[r.id] === dateKey) return false;
    const [h, m] = r.time.split(":").map(Number);
    return Math.abs(minutes - (h * 60 + m)) <= 4;
  });

  if (!due.length) return NextResponse.json({ ok: true, sent: 0 });

  let subscriptions = state.subscriptions;
  const lastSent = { ...state.lastSent };
  let sent = 0;

  for (const r of due) {
    const payload = JSON.stringify({ title: r.label, body: r.body, url: r.url ?? "/" });
    const results = await Promise.allSettled(
      subscriptions.map((sub) => sendOne(sub, payload))
    );
    // Drop subscriptions the push service reports as gone (uninstalled/expired)
    const dead = new Set(
      results
        .map((res, i) => (res.status === "rejected" && isGone(res.reason) ? subscriptions[i].endpoint : null))
        .filter((x): x is string => x != null)
    );
    if (dead.size) subscriptions = subscriptions.filter((s) => !dead.has(s.endpoint));
    lastSent[r.id] = dateKey;
    sent++;
  }

  await writePushState({ ...state, subscriptions, lastSent });
  return NextResponse.json({ ok: true, sent });
}

function sendOne(sub: PushSubscriptionJSON, payload: string) {
  return webpush.sendNotification(sub as any, payload);
}

function isGone(err: unknown): boolean {
  const code = (err as any)?.statusCode;
  return code === 404 || code === 410;
}
