// Construye el mapa de imágenes de ejercicios usando free-exercise-db (licencia abierta).
// Descarga antes el JSON y ejecuta `node scripts/build-img-map.mjs`:
//   curl -s -o exdb.tmp.json https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json
import { readFileSync, writeFileSync } from "node:fs";

const db = JSON.parse(readFileSync(new URL("../exdb.tmp.json", import.meta.url)));
const BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

// Nombre exacto en la DB (máxima prioridad). null = sin imagen (fallback a búsqueda).
const OVERRIDES = {
  "Press banca con mancuernas": "Dumbbell Bench Press",
  "Remo con mancuerna a 1 brazo": "One-Arm Dumbbell Row",
  "Press militar sentado con mancuernas": "Seated Dumbbell Press",
  "Jalón al pecho (polea)": "Wide-Grip Lat Pulldown",
  "Curl bíceps con mancuernas alterno": "Alternate Incline Dumbbell Curl",
  "Extensión tríceps en polea (cuerda)": "Triceps Pushdown - Rope Attachment",
  "Plancha frontal": "Plank",
  "Pallof press con banda": "Pallof Press",
  "Sentadilla goblet con mancuerna": "Goblet Squat",
  "Prensa de piernas": "Leg Press",
  "Zancadas caminando con mancuernas": "Bodyweight Walking Lunge",
  "Extensión de cuádriceps (máquina)": "Leg Extensions",
  "Curl femoral tumbado (máquina)": "Lying Leg Curls",
  "Elevación de gemelos de pie": "Rocking Standing Calf Raise",
  "Hiperextensiones": "Hyperextensions (Back Extensions)",
  "Dead bug con peso ligero": "Dead Bug",
  "Dominadas asistidas (máquina o banda)": "Pullups",
  "Press inclinado con mancuernas": "Incline Dumbbell Press",
  "Remo en máquina (pecho apoyado)": "Seated Cable Rows",
  "Aperturas en máquina (peck deck)": "Butterfly",
  "Face pull en polea": "Face Pull",
  "Curl martillo con mancuernas": "Hammer Curls",
  "Plancha lateral": "Side Bridge",
  "Hollow body hold": "Flat Bench Lying Leg Raise",
  "Hip thrust con barra (apoyo bajo)": "Barbell Hip Thrust",
  "Peso muerto rumano con mancuernas": "Romanian Deadlift",
  "Sentadilla búlgara con mancuernas": "Split Squat with Dumbbells",
  "Curl femoral sentado (máquina)": "Seated Leg Curl",
  "Abducción de cadera (máquina o banda)": "Thigh Abductor",
  "Elevación de gemelos sentado": "Barbell Seated Calf Raise",
  "Bird-dog con mancuerna ligera": null, // sin match fiable -> fallback a vídeo
  "Pallof press de pie": "Pallof Press",
};

const byName = new Map(db.map((x) => [x.name, x]));
const out = {};
const unmatched = [];

for (const [es, target] of Object.entries(OVERRIDES)) {
  if (target === null) {
    out[es] = { fuente: null, imagenes: [] };
    unmatched.push(es);
    continue;
  }
  const hit = byName.get(target);
  if (hit && hit.images?.length) {
    out[es] = { fuente: hit.name, imagenes: hit.images.map((i) => BASE + i) };
  } else {
    out[es] = { fuente: null, imagenes: [] };
    unmatched.push(`${es} (target no encontrado: ${target})`);
  }
}

writeFileSync(
  new URL("../content/knowledge/ejercicios-imagenes.json", import.meta.url),
  JSON.stringify(out, null, 2)
);
console.log("Con imagen:", Object.values(out).filter((v) => v.imagenes.length).length, "/", Object.keys(out).length);
console.log("Sin match (fallback):", unmatched.join(", ") || "ninguno");
