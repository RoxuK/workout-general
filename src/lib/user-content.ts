"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { normalizeRecipes } from "./plan-import";
import { EMPTY_PLAN, EMPTY_NUTRITION, EMPTY_RECIPES, EMPTY_SHOPPING_LIST } from "./content";
import type { Plan, NutritionTargets, Recipe, ShoppingCategory } from "./types";

export function useActivePlan(): Plan {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.plan ?? EMPTY_PLAN;
}

export function useNutritionTargets(): NutritionTargets {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.nutrition ?? EMPTY_NUTRITION;
}

// Normalized on read too, not just on import: a config saved before the
// importer normalized would otherwise stay broken until the user re-imports.
export function useRecipes(): Recipe[] {
  const recipes = useStore((s) => s.userConfig?.recipes);
  return useMemo(() => (recipes ? normalizeRecipes(recipes) : EMPTY_RECIPES), [recipes]);
}

export function useShoppingList(): ShoppingCategory[] {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.shoppingList ?? EMPTY_SHOPPING_LIST;
}

export function useUserName(): string | null {
  return useStore((s) => s.userName);
}
