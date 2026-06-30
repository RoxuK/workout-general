"use client";

import { useStore } from "./store";
import { getPlanActivo, NUTRICION } from "./content";
import type { Plan, NutritionTargets } from "./types";

export function useActivePlan(): Plan {
  const userConfig = useStore((s) => s.userConfig);
  return (userConfig?.plan ?? getPlanActivo()) as Plan;
}

export function useNutritionTargets(): NutritionTargets & { kcal: number } {
  const userConfig = useStore((s) => s.userConfig);
  return (userConfig?.nutrition ?? NUTRICION) as NutritionTargets & { kcal: number };
}

export function useUserName(): string | null {
  return useStore((s) => s.userName);
}
