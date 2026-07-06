"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useActivePlan } from "@/lib/user-content";
import { useT } from "@/lib/i18n";

// Shown on the dashboard and session list when a workout draft exists, so the
// user can jump back in — but reopening the app never redirects on its own,
// it always lands wherever the user navigated to.
export default function ResumeBanner({ mounted }: { mounted: boolean }) {
  const t = useT();
  const plan = useActivePlan();
  const draft = useStore((s) => s.workoutDraft);
  if (!mounted || !draft) return null;
  const session = plan.sessions.find((s) => s.id === draft.sessionId);
  if (!session) return null;

  return (
    <Link
      href={`/entreno/${draft.sessionId}`}
      className="mb-4 flex items-center justify-between rounded-2xl border border-accent/50 bg-accent-soft p-3"
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-accent">{t("Workout in progress")}</div>
        <div className="truncate text-sm">{t(session.name)}</div>
      </div>
      <span className="chip shrink-0 border-accent text-accent inline-flex items-center gap-1">
        {t("Continue")} <ArrowRight size={14} />
      </span>
    </Link>
  );
}
