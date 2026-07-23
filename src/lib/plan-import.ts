// Parsing + validation for AI-generated plan JSON. Shared by the onboarding
// flow and the "import next phase" block in Progress.

import type { Recipe, UserConfig } from "./types";

// People rarely copy just the fenced code block — they copy the AI's whole
// reply, prose and all. Find the ```json fence anywhere in the pasted text
// (not just at the very start/end), or fall back to the outermost {...} if
// there's no fence at all.
export function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const block = fenced ? fenced[1].trim() : trimmed;
  const first = block.indexOf("{");
  const last = block.lastIndexOf("}");
  const json = first !== -1 && last > first ? block.slice(first, last + 1) : block;
  // Trailing commas ("...},\n}") are invalid JSON but a common slip in long
  // AI-generated output — never valid otherwise, so safe to always strip.
  return json.replace(/,(\s*[}\]])/g, "$1");
}

// JSON.parse's error message includes a character offset (most browsers —
// format varies by engine, e.g. Safari on iPhone differs from Chrome/V8).
// Turn that into a line/column plus a short snippet of the actual text, so
// whoever hits an error we didn't anticipate can pinpoint and fix it
// themselves instead of having to send the whole file over.
export function describeParseError(text: string, e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  const m = message.match(/position (\d+)/i);
  if (!m) return message;
  const pos = Math.min(parseInt(m[1], 10), text.length);
  const before = text.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  const snippet = text.slice(Math.max(0, pos - 25), pos + 25).replace(/\s+/g, " ").trim();
  return `${message} — line ${line}, column ${col}. Near: "…${snippet}…"`;
}

// The AI drifts off the recipe schema more often than any other part of the
// config: it emits "meal"/"prepMinutes"/"instructions" instead of
// "moment"/"time"/"steps", and drops "id" entirely. Missing ids made every
// card share the same key (tapping + selected them all) and a missing "steps"
// array crashed the page on open. Accept the aliases and always fill the
// required fields, so a near-miss shape can never take the app down.
export function normalizeRecipes(raw: unknown): Recipe[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x, i) => {
    const r = (x ?? {}) as Record<string, any>;
    const name = String(r.name ?? `Recipe ${i + 1}`);
    const steps = Array.isArray(r.steps)
      ? r.steps.map(String)
      : typeof r.instructions === "string"
      ? r.instructions.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean)
      : [];
    const minutes = r.prepMinutes ?? r.prepTime;
    return {
      id: String(r.id ?? `${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
      name,
      moment: String(r.moment ?? r.meal ?? "Other").replace(/^./, (c) => c.toUpperCase()),
      time: String(r.time ?? (minutes != null ? `${minutes} min` : "—")),
      kcal: Number(r.kcal) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fats: Number(r.fats ?? r.fat) || 0,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(String) : [],
      steps,
    };
  });
}

export function normalizeConfig(config: UserConfig): UserConfig {
  return {
    ...config,
    recipes: normalizeRecipes(config.recipes),
    shoppingList: Array.isArray(config.shoppingList)
      ? config.shoppingList.filter((c) => c && Array.isArray(c.items))
      : [],
  };
}

export function validateConfig(data: unknown): string | null {
  if (!data || typeof data !== "object") return "Not a valid JSON object";
  const d = data as Record<string, unknown>;
  if (!d.plan || typeof d.plan !== "object") return 'Missing "plan" key';
  const p = d.plan as Record<string, unknown>;
  if (!p.id) return "Missing plan.id";
  if (!p.name) return "Missing plan.name";
  if (!Array.isArray(p.sessions) || p.sessions.length === 0) return "Missing plan.sessions (must be a non-empty array)";
  if (!Array.isArray(p.weeklySplit)) return "Missing plan.weeklySplit";
  if (!d.nutrition || typeof d.nutrition !== "object") return 'Missing "nutrition" key';
  const n = d.nutrition as Record<string, unknown>;
  if (typeof n.kcal !== "number") return "nutrition.kcal must be a number";
  if (typeof n.protein !== "number") return "nutrition.protein must be a number";
  if (d.recipes !== undefined && !Array.isArray(d.recipes)) return "recipes must be an array";
  if (d.shoppingList !== undefined && !Array.isArray(d.shoppingList)) return "shoppingList must be an array";
  if (d.sex !== undefined && !["male", "female", "other"].includes(d.sex as string)) return 'sex must be "male", "female" or "other"';
  return null;
}
