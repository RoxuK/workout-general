// Self-check for the recipe normalizer: the AI's off-schema output must never
// produce a missing id (which made "+" select every card) or a missing steps
// array (which crashed the nutrition page on open).
// Run: node scripts/test-normalize-recipes.mjs
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/lib/plan-import.ts"),
  "utf8"
);
// Strip TS types so the function can run under plain node.
const body = src
  .slice(src.indexOf("export function normalizeRecipes"), src.indexOf("export function normalizeConfig"))
  .replace(/export function normalizeRecipes\(raw: unknown\): Recipe\[\]/, "function normalizeRecipes(raw)")
  .replace(/ as Record<string, any>/, "");
const normalizeRecipes = new Function(`${body}; return normalizeRecipes;`)();

// The shape the AI actually emitted (meal/prepMinutes/instructions, no id).
const out = normalizeRecipes([
  { name: "Greek Yogurt Protein Bowl", meal: "breakfast", kcal: 450, protein: 40, carbs: 50, fats: 12, prepMinutes: 5, ingredients: ["250 g Greek yogurt"], instructions: "Stir the whey in. Top with berries." },
  { name: "Greek Yogurt Protein Bowl", meal: "snack" },
]);

assert.equal(out.length, 2);
assert.ok(out[0].id && out[1].id, "every recipe gets an id");
assert.notEqual(out[0].id, out[1].id, "duplicate names must not collide — that selected every card at once");
assert.equal(out[0].moment, "Breakfast", "meal -> moment, capitalised for the tab label");
assert.equal(out[0].time, "5 min", "prepMinutes -> time");
assert.deepEqual(out[0].steps, ["Stir the whey in.", "Top with berries."], "instructions string -> steps array");
assert.deepEqual(out[1].steps, [], "missing instructions must not crash the recipe view");
assert.deepEqual(out[1].ingredients, []);
assert.equal(out[1].kcal, 0, "missing macros fall back to 0, not NaN");

// Already-correct input passes through untouched.
const good = normalizeRecipes([{ id: "r1", name: "X", moment: "Lunch", time: "10 min", kcal: 1, protein: 1, carbs: 1, fats: 1, ingredients: ["a"], steps: ["s"] }]);
assert.deepEqual(good[0], { id: "r1", name: "X", moment: "Lunch", time: "10 min", kcal: 1, protein: 1, carbs: 1, fats: 1, ingredients: ["a"], steps: ["s"] });

assert.deepEqual(normalizeRecipes(undefined), [], "a config with no recipes is not an error");

console.log("normalizeRecipes: all checks passed");
