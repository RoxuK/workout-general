"use client";

import { useState } from "react";
import { ClipboardCopy, Check, AlertCircle, ExternalLink, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { UserConfig } from "@/lib/types";

// The prompt the user copies into claude.ai to generate their plan JSON
const CLAUDE_PROMPT = `You are a personal trainer and nutritionist setting up a workout app for me.

Interview me by asking these questions ONE AT A TIME — wait for each answer before asking the next:

1. What is your main fitness goal? (lose fat / build muscle / body recomposition / general fitness)
2. Your current weight (kg), height (cm), and age?
3. What training equipment do you have access to? (full gym / home with dumbbells / bodyweight only)
4. How many days per week can you train, and for how long per session?
5. Any injuries, chronic pain, or physical limitations I should know about?
6. Brief description of your current diet. Any foods you cannot or do not eat?
7. Your target weight or physique goal, and any timeline?

After I answer ALL seven questions, output ONLY a \`\`\`json code block in this exact schema — no other text outside the block:

\`\`\`json
{
  "plan": {
    "id": "block-1",
    "nombre": "Plan name",
    "fechaInicio": "YYYY-MM-DD",
    "fechaFin": "YYYY-MM-DD",
    "pesoInicial": 80,
    "pesoObjetivo": 75,
    "frecuencia": "4 días/semana · 60 min/sesión",
    "estructura": "Upper / Lower split",
    "resumen": "Brief plan summary (2–3 sentences)",
    "fases": [
      { "nombre": "Foundation", "semanas": "1–4", "objetivo": "Phase goal", "rpe": "RPE 6–7" },
      { "nombre": "Build", "semanas": "5–8", "objetivo": "Phase goal", "rpe": "RPE 7–8" }
    ],
    "splitSemanal": [
      { "dia": "Lunes", "sesion": "Upper A" },
      { "dia": "Martes", "sesion": "Lower A" },
      { "dia": "Miércoles", "sesion": "Descanso" },
      { "dia": "Jueves", "sesion": "Upper B" },
      { "dia": "Viernes", "sesion": "Lower B" },
      { "dia": "Sábado", "sesion": "Cardio o descanso" },
      { "dia": "Domingo", "sesion": "Descanso" }
    ],
    "notaSplit": "Scheduling flexibility note",
    "calentamiento": {
      "duracion": "10 min",
      "nota": "Always warm up before training",
      "pasos": [
        { "ejercicio": "Light cardio", "detalle": "5 min easy pace" },
        { "ejercicio": "Dynamic stretching", "detalle": "Hip circles, shoulder rolls, leg swings" }
      ]
    },
    "sesiones": [
      {
        "id": "upper-a",
        "nombre": "Upper A",
        "foco": "Push dominant (chest / shoulders / triceps)",
        "cardioPost": "10 min optional",
        "ejercicios": [
          { "nombre": "Dumbbell Bench Press", "series": 3, "reps": "10", "descanso": "90s", "notas": "" },
          { "nombre": "Dumbbell Row", "series": 3, "reps": "10/side", "descanso": "60s", "notas": "" },
          { "nombre": "Overhead Press", "series": 3, "reps": "10", "descanso": "90s", "notas": "" },
          { "nombre": "Lat Pulldown", "series": 3, "reps": "12", "descanso": "60s", "notas": "" },
          { "nombre": "Bicep Curl", "series": 2, "reps": "12", "descanso": "45s", "notas": "" },
          { "nombre": "Tricep Pushdown", "series": 2, "reps": "12", "descanso": "45s", "notas": "" }
        ]
      }
    ],
    "progresiones": [
      { "fase": "Foundation", "puntos": ["Add 2.5 kg when you complete all reps cleanly for 2 sessions in a row"] }
    ],
    "reglaLumbar": "N/A"
  },
  "nutrition": {
    "kcal": 2200,
    "proteina": 160,
    "carbos": 230,
    "grasas": 70,
    "nota": "Adjust based on weekly weight trend"
  }
}
\`\`\`

Rules for the JSON:
- "splitSemanal[].dia" MUST use Spanish day names: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- Include 3–4 training sessions in "sesiones", each with 6–8 exercises
- Set "fechaInicio" to today's date and "fechaFin" to 12 weeks from today
- Adapt the split to the number of training days the user told you

Start the interview now.`;

function validateConfig(data: unknown): string | null {
  if (!data || typeof data !== "object") return "Not a valid JSON object";
  const d = data as Record<string, unknown>;
  if (!d.plan || typeof d.plan !== "object") return 'Missing "plan" key';
  const p = d.plan as Record<string, unknown>;
  if (!p.id) return "Missing plan.id";
  if (!p.nombre) return "Missing plan.nombre";
  if (!Array.isArray(p.sesiones) || p.sesiones.length === 0) return "Missing plan.sesiones (must be a non-empty array)";
  if (!Array.isArray(p.splitSemanal)) return "Missing plan.splitSemanal";
  if (!d.nutrition || typeof d.nutrition !== "object") return 'Missing "nutrition" key';
  const n = d.nutrition as Record<string, unknown>;
  if (typeof n.kcal !== "number") return "nutrition.kcal must be a number";
  if (typeof n.proteina !== "number") return "nutrition.proteina must be a number";
  return null;
}

export default function Onboarding() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setUserName = useStore((s) => s.setUserName);
  const setUserConfig = useStore((s) => s.setUserConfig);

  function handleNameSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setStep(1);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CLAUDE_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text in textarea
    }
  }

  function handleImport() {
    setError(null);
    let parsed: unknown;
    try {
      // strip markdown code fences if user copied the whole claude response
      const clean = json.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
      parsed = JSON.parse(clean);
    } catch {
      setError("Could not parse JSON. Make sure you copied only the JSON block Claude gave you.");
      return;
    }
    const err = validateConfig(parsed);
    if (err) {
      setError(`Invalid plan: ${err}. Ask Claude to regenerate the JSON block.`);
      return;
    }
    setUserConfig(parsed as UserConfig);
  }

  return (
    <div className="mx-auto max-w-app px-4 py-10 animate-fade-up">
      {/* Step indicators */}
      <div className="mb-8 flex items-center gap-2 text-xs text-muted">
        {["Name", "Get plan", "Import"].map((label, i) => (
          <span key={i} className={`flex items-center gap-1 ${i === step ? "text-accent font-medium" : ""}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
              i < step ? "border-good bg-good/10 text-good" : i === step ? "border-accent bg-accent/10 text-accent" : "border-line"
            }`}>
              {i < step ? <Check size={10} /> : i + 1}
            </span>
            {label}
            {i < 2 && <span className="mx-1 text-line">—</span>}
          </span>
        ))}
      </div>

      {/* Step 0: Name */}
      {step === 0 && (
        <div>
          <p className="label mb-1">Welcome</p>
          <h1 className="font-display text-4xl mb-2">What's your name?</h1>
          <p className="text-sm text-muted mb-8">
            We'll use it to personalise the app for you.
          </p>
          <input
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-lg placeholder:text-muted focus:border-accent focus:outline-none"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            autoFocus
          />
          <button
            className="btn mt-4 w-full flex items-center justify-center gap-2"
            onClick={handleNameSubmit}
            disabled={!name.trim()}
          >
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Copy Claude prompt */}
      {step === 1 && (
        <div>
          <p className="label mb-1">Build your plan</p>
          <h1 className="font-display text-4xl mb-2">Chat with Claude</h1>
          <p className="text-sm text-muted mb-6">
            Copy the prompt below and paste it into{" "}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline"
            >
              claude.ai
            </a>
            . Claude will interview you and generate your personalised training and nutrition plan.
          </p>

          <div className="relative">
            <textarea
              readOnly
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted font-mono resize-none focus:outline-none"
              rows={8}
              value={CLAUDE_PROMPT}
            />
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-surface-2 border border-line px-3 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              {copied ? <Check size={13} className="text-good" /> : <ClipboardCopy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost mt-3 w-full flex items-center justify-center gap-2"
          >
            Open claude.ai <ExternalLink size={14} />
          </a>

          <button
            className="btn mt-3 w-full flex items-center justify-center gap-2"
            onClick={() => setStep(2)}
          >
            I have my JSON <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Paste JSON */}
      {step === 2 && (
        <div>
          <p className="label mb-1">Almost done</p>
          <h1 className="font-display text-4xl mb-2">Import your plan</h1>
          <p className="text-sm text-muted mb-6">
            Paste the JSON block Claude gave you at the end of your conversation.
          </p>

          <textarea
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-xs font-mono resize-none focus:border-accent focus:outline-none"
            rows={12}
            placeholder={'Paste the ```json block here...'}
            value={json}
            onChange={(e) => { setJson(e.target.value); setError(null); }}
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            className="btn mt-4 w-full"
            onClick={handleImport}
            disabled={!json.trim()}
          >
            Import plan
          </button>
          <button
            className="btn-ghost mt-2 w-full text-sm"
            onClick={() => setStep(1)}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
