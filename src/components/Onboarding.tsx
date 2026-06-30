"use client";

import { useState } from "react";
import { ClipboardCopy, Check, AlertCircle, ExternalLink, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import type { UserConfig } from "@/lib/types";

// The prompt the user copies into claude.ai to generate their plan JSON
const CLAUDE_PROMPT = `You are a certified personal trainer and registered dietitian with 15+ years of experience designing individualized strength training and nutrition programs. You're running an intake consultation with a new client before writing their first program.

Interview me by asking these questions ONE AT A TIME — wait for each answer before asking the next. Ask natural follow-up questions if an answer is vague or seems to conflict with something I said earlier.

1. Sex (male / female / other) — this affects calorie and protein baseline estimates.
2. Age.
3. Current weight (kg) and height (cm).
4. Main goal: lose fat, build muscle, body recomposition, general fitness, or athletic performance? In your own words, what does success look like in 3 months?
5. Target weight or physique goal, and your ideal timeline.
6. Training experience: complete beginner, some experience, or experienced lifter? What (if anything) are you currently doing for exercise?
7. What equipment do you have access to: full gym, home gym with dumbbells, bodyweight only, or something else?
8. How many days per week can you realistically train, and how many minutes per session?
9. Any injuries, chronic pain, past surgeries, or physical limitations I should design around? Any movements you know you need to avoid?
10. Any medical conditions or medications relevant to exercise or nutrition (e.g. diabetes, thyroid issues, pregnancy, heart conditions)?
11. Describe a typical day of eating for you right now, as specifically as you can.
12. Any food allergies, intolerances, or foods you refuse to eat?
13. On average, how many hours do you sleep, and how would you rate your sleep quality?
14. How stressful is your daily life or job right now (low / moderate / high), and how active is your day outside of training (desk job vs. on your feet)?
15. Anything else you want me to know before I write your program?

After I answer ALL fifteen questions:
1. First, write a short assessment (3-5 sentences, plain text, not JSON) summarizing my profile, your estimate of my maintenance calories (state the formula you used, e.g. Mifflin-St Jeor, and the activity multiplier you applied), and the daily calorie target you're setting and why.
2. Then output ONLY a \`\`\`json code block in the exact schema below — no other text outside the code block.

\`\`\`json
{
  "plan": {
    "id": "block-1",
    "name": "Plan name",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "startingWeight": 80,
    "targetWeight": 75,
    "frequency": "4 days/week · 60 min/session",
    "structure": "Upper / Lower split",
    "summary": "Brief plan summary (2–3 sentences)",
    "phases": [
      { "name": "Foundation", "weeks": "1–4", "goal": "Phase goal", "rpe": "RPE 6–7" },
      { "name": "Build", "weeks": "5–8", "goal": "Phase goal", "rpe": "RPE 7–8" }
    ],
    "weeklySplit": [
      { "day": "Monday", "session": "Upper A" },
      { "day": "Tuesday", "session": "Lower A" },
      { "day": "Wednesday", "session": "Rest" },
      { "day": "Thursday", "session": "Upper B" },
      { "day": "Friday", "session": "Lower B" },
      { "day": "Saturday", "session": "Cardio or rest" },
      { "day": "Sunday", "session": "Rest" }
    ],
    "splitNote": "Scheduling flexibility note",
    "warmup": {
      "duration": "10 min",
      "note": "Always warm up before training",
      "steps": [
        { "exercise": "Light cardio", "detail": "5 min easy pace" },
        { "exercise": "Dynamic stretching", "detail": "Hip circles, shoulder rolls, leg swings" }
      ]
    },
    "sessions": [
      {
        "id": "upper-a",
        "name": "Upper A",
        "focus": "Push dominant (chest / shoulders / triceps)",
        "postCardio": "10 min optional",
        "exercises": [
          { "name": "Dumbbell Bench Press", "sets": 3, "reps": "10", "rest": "90s", "notes": "" },
          { "name": "Dumbbell Row", "sets": 3, "reps": "10/side", "rest": "60s", "notes": "" },
          { "name": "Overhead Press", "sets": 3, "reps": "10", "rest": "90s", "notes": "" },
          { "name": "Lat Pulldown", "sets": 3, "reps": "12", "rest": "60s", "notes": "" },
          { "name": "Bicep Curl", "sets": 2, "reps": "12", "rest": "45s", "notes": "" },
          { "name": "Tricep Pushdown", "sets": 2, "reps": "12", "rest": "45s", "notes": "" }
        ]
      }
    ],
    "progressions": [
      { "phase": "Foundation", "points": ["Add 2.5 kg when you complete all reps cleanly for 2 sessions in a row"] }
    ],
    "safetyNote": "Any injury-specific guidance from the intake, or \\"No specific restrictions noted.\\""
  },
  "nutrition": {
    "kcal": 2200,
    "protein": 160,
    "carbs": 230,
    "fats": 70,
    "note": "Adjust based on weekly weight trend"
  }
}
\`\`\`

Rules for the JSON:
- "weeklySplit[].day" MUST use English day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Include 3–5 training sessions in "sessions" depending on how many days I said I can train, each with 6–8 exercises
- Set "startDate" to today's date and "endDate" to 12 weeks from today
- Adapt every exercise to the equipment I actually have access to
- If I mentioned injuries or limitations, reflect them in "safetyNote" and avoid or modify any exercise that would aggravate them
- Set the exercise "sets"/"reps"/"rest" appropriately for my stated experience level

Start the interview now.`;

function validateConfig(data: unknown): string | null {
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
            . Claude will run a full intake interview and generate your personalised training and nutrition plan.
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
