"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import Onboarding from "./Onboarding";

// Overlays the entire app with the onboarding screen until a user is configured.
// Uses position:fixed so it covers BottomNav too.
export default function AppGate() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const userName = useStore((s) => s.userName);
  const userConfig = useStore((s) => s.userConfig);

  if (!mounted || (userName && userConfig)) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <Onboarding />
    </div>
  );
}
