"use client";

import { useStore } from "./store";
import { EMPTY_PLAN, EMPTY_NUTRITION } from "./content";
import type { Plan, NutritionTargets } from "./types";

export function useActivePlan(): Plan {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.plan ?? EMPTY_PLAN;
}

export function useNutritionTargets(): NutritionTargets {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.nutrition ?? EMPTY_NUTRITION;
}

export function useUserName(): string | null {
  return useStore((s) => s.userName);
}
