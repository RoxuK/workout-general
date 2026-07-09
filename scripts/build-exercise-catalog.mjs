// Builds content/knowledge/ejercicios-catalogo.json from the hasaneyldrm/exercises-dataset CDN.
// Run once locally before designing a new routine:
//   node scripts/build-exercise-catalog.mjs
//
// The output file is gitignored (too large); ejercicios-index.json (the browsable name list)
// is committed instead.

import { writeFileSync } from "node:fs";

const SRC = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/data/exercises.json";
const CDN = "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/";

console.log("Downloading exercises dataset…");
const res = await fetch(SRC);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const d = await res.json();

const out = d.map(x => ({
  id: x.id,
  name: x.name,
  cat: x.category,
  eq: x.equipment,
  target: x.target,
  muscles: x.secondary_muscles,
  steps_es: x.instruction_steps?.es ?? [],
  img: CDN + x.image,
  gif: CDN + x.gif_url,
}));

const path = "content/knowledge/ejercicios-catalogo.json";
writeFileSync(path, JSON.stringify(out, null, 0));
console.log(`Written ${out.length} exercises to ${path} (${Math.round(out.length / 1024 * 300)} KB)`);
