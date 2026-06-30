"use client";

import { useStore } from "./store";
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

export function useRecipes(): Recipe[] {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.recipes ?? EMPTY_RECIPES;
}

export function useShoppingList(): ShoppingCategory[] {
  const userConfig = useStore((s) => s.userConfig);
  return userConfig?.shoppingList ?? EMPTY_SHOPPING_LIST;
}

export function useUserName(): string | null {
  return useStore((s) => s.userName);
}
