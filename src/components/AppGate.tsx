"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import Onboarding from "./Onboarding";

// Routes that must stay reachable without finishing onboarding — e.g. the
// privacy policy URL submitted to Google Play needs to load for reviewers
// (and anyone else) who haven't set up the app yet.
const UNGATED_ROUTES = ["/privacy"];

// Overlays the entire app with the onboarding screen until a user is configured.
// Uses position:fixed so it covers BottomNav too.
export default function AppGate() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pathname = usePathname();
  const userName = useStore((s) => s.userName);
  const userConfig = useStore((s) => s.userConfig);

  if (!mounted || (userName && userConfig) || UNGATED_ROUTES.includes(pathname)) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <Onboarding />
    </div>
  );
}
