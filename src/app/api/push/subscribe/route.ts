import { NextRequest, NextResponse } from "next/server";
import { readPushState, writePushState, type PushSubscriptionJSON } from "@/lib/push-server";
import type { Reminder } from "@/lib/types";

export const dynamic = "force-dynamic";

// Called whenever the client has notification permission and either just
// subscribed to push or its reminders changed — keeps the server copy (used
// by the cron tick) in sync with what's in the browser's store.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const subscription = body?.subscription as PushSubscriptionJSON | undefined;
  const reminders = body?.reminders as Reminder[] | undefined;
  const timezone = body?.timezone as string | undefined;
  if (!subscription?.endpoint || !Array.isArray(reminders) || !timezone) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const state = await readPushState();
  const subscriptions = state.subscriptions.filter((s) => s.endpoint !== subscription.endpoint);
  subscriptions.push(subscription);
  await writePushState({ ...state, subscriptions, reminders, timezone });

  return NextResponse.json({ ok: true });
}
