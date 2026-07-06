"use client";

// Consumed once per fresh app load (full reload, PWA reopened after being
// unloaded in the background...). Whichever screen mounts first checks for
// an in-progress workout draft and redirects to it — but once consumed,
// navigating on purpose (tapping "Sessions") won't trigger it again within
// the same JS session.
let consumed = false;

export function shouldAutoResume(): boolean {
  if (consumed) return false;
  consumed = true;
  return true;
}
