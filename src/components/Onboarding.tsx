"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, Check, AlertCircle, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { buildDefaultConfig } from "@/lib/default-plan";
import { extractJson, describeParseError, validateConfig } from "@/lib/plan-import";
import type { UserConfig } from "@/lib/types";

// The prompt the user copies into an AI chat assistant (Claude, ChatGPT, Gemini,
// or any other LLM) to generate their plan JSON. Intentionally not tied to one
// provider — the app works the same regardless of which assistant answers it.
const AI_PROMPT = `You are a certified personal trainer and registered dietitian with 15+ years of experience designing individualized strength training and nutrition programs, including full meal plans and grocery lists. You're running an intake consultation with a new client before writing their first program.

IMPORTANT: No matter what language I answer in, write EVERY part of your output — the assessment and the JSON — in English.

Interview me by asking these questions ONE AT A TIME — wait for each answer before asking the next. Ask natural follow-up questions if an answer is vague or seems to conflict with something I said earlier.

1. Sex (male / female / other) — this affects calorie and protein baseline estimates.
2. Age.
3. Current weight (kg) and height (cm).
4. Main goal: lose fat, build muscle, body recomposition, general fitness, or athletic performance? In your own words, what does success look like in 3 months?
5. Target weight or physique goal, and your ideal timeline.
6. Training experience: complete beginner, some experience, or experienced lifter? What (if anything) are you currently doing for exercise?
7. What equipment do you have access to: full gym, home gym with dumbbells, bodyweight only, or something else?
8. How many days per week can you realistically train, and how many minutes per session?
9. Do you travel often, or do you sometimes need a no-equipment / bodyweight-only backup workout (hotel room, no gym access)?
10. Any injuries, chronic pain, past surgeries, or physical limitations I should design around? Any movements you know you need to avoid? Be as specific as possible about which body part and what to avoid or substitute.
11. Any medical conditions or medications relevant to exercise or nutrition (e.g. diabetes, thyroid issues, pregnancy, heart conditions)?
12. Describe a typical day of eating for you right now, as specifically as you can.
13. Any food allergies, intolerances, or foods you refuse to eat? Any cuisines or ingredients you love and want to see more of?
14. Do you cook for yourself? Roughly how much time can you spend on meal prep per day?
15. On average, how many hours do you sleep, and how would you rate your sleep quality?
16. How stressful is your daily life or job right now (low / moderate / high), and how active is your day outside of training (desk job vs. on your feet)?
17. Anything else you want me to know before I write your program?

After I answer ALL seventeen questions:
1. First, write a short assessment (3-5 sentences, plain text, not JSON, in English) summarizing my profile, your estimate of my maintenance calories (state the formula you used, e.g. Mifflin-St Jeor, and the activity multiplier you applied), and the daily calorie target you're setting and why.
2. Then output ONLY a \`\`\`json code block in the exact schema below — no other text outside the code block. Every string value in the JSON must be in English.

\`\`\`json
{
  "sex": "female",
  "goal": "recomposition",
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
      { "name": "Phase 1 name — decide based on my profile", "weeks": "1–3", "goal": "What this phase is actually for, given my goal and experience", "rpe": "RPE range" },
      { "name": "Phase 2 name — decide based on my profile", "weeks": "4–7", "goal": "What this phase is actually for, given my goal and experience", "rpe": "RPE range" },
      { "name": "Phase 3 name — decide based on my profile", "weeks": "8–10", "goal": "What this phase is actually for, given my goal and experience", "rpe": "RPE range" },
      { "name": "Phase 4 name — decide based on my profile", "weeks": "11–12", "goal": "What this phase is actually for, given my goal and experience", "rpe": "RPE range" }
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
        { "exercise": "Dynamic stretching", "detail": "Hip circles, shoulder rolls, leg swings" },
        { "exercise": "Activation drill", "detail": "Tailored to today's session and any limitation from question 10" },
        { "exercise": "Ramp-up sets", "detail": "1-2 light sets of the first exercise before working weight" }
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
      },
      {
        "id": "travel-a",
        "name": "Travel / No Equipment",
        "focus": "Full body, bodyweight only",
        "travel": true,
        "equipment": "No equipment",
        "exercises": [
          { "name": "Push-up", "sets": 3, "reps": "12–15", "rest": "60s", "notes": "" },
          { "name": "Bodyweight Squat", "sets": 3, "reps": "15–20", "rest": "60s", "notes": "" }
        ]
      }
    ],
    "progressions": [
      { "phase": "Must match a name from \"phases\" above", "points": ["2–4 concrete, actionable points for THIS phase: specific load increases, rep/set changes, or technique progressions — not generic advice"] }
    ],
    "safetyNote": "Specific, actionable guidance built from whatever injury/limitation I described in question 10 — name the body part and what to avoid or substitute. If I have no limitations, write \\"No specific restrictions noted.\\""
  },
  "nutrition": {
    "kcal": 2200,
    "protein": 160,
    "carbs": 230,
    "fats": 70,
    "note": "Adjust based on weekly weight trend"
  },
  "recipes": [
    {
      "id": "breakfast-1",
      "name": "Recipe name",
      "moment": "Breakfast",
      "time": "10 min",
      "kcal": 450,
      "protein": 30,
      "carbs": 45,
      "fats": 15,
      "ingredients": ["150g chicken breast", "1 cup rice", "..."],
      "steps": ["Step 1...", "Step 2..."]
    }
  ],
  "shoppingList": [
    { "category": "Protein", "items": ["Chicken breast", "Eggs", "Greek yogurt"] },
    { "category": "Carbs", "items": ["Rice", "Oats", "Whole wheat bread"] },
    { "category": "Vegetables & fruit", "items": ["Spinach", "Bananas"] },
    { "category": "Pantry & other", "items": ["Olive oil", "Peanut butter"] }
  ]
}
\`\`\`

Rules for the JSON:
- The JSON must be strictly valid: NO trailing commas after the last item in any array or object, every string properly escaped (use \\n for line breaks and \\" for quotes inside a string, never a literal line break or unescaped quote), and no comments. Before you output the code block, mentally re-scan it end to end specifically for a trailing comma right before a closing } or ] — that is the single most common mistake in long JSON like this one
- "sex" must be exactly "male", "female", or "other", taken directly from my answer to question 1
- "goal" must be exactly one of "lose-fat", "build-muscle", "recomposition", "general-fitness", or "athletic-performance", taken from my answer to question 4 (pick the closest match)
- "weeklySplit[].day" MUST use English day names: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- Include 3–5 training sessions in "sessions" depending on how many days I said I can train, each with 6–8 exercises. If I said I travel often or want a backup workout, include one extra session with "travel": true and "equipment": "No equipment" (or similar), made of bodyweight-only exercises — it does not need to appear in "weeklySplit"
- Set "startDate" to today's date and "endDate" to 12 weeks from today
- Adapt every exercise to the equipment I actually have access to
- "safetyNote" must reflect MY actual answer to question 10 specifically — never invent or assume a body part I didn't mention. If I have no injuries or limitations, just say so
- Set the exercise "sets"/"reps"/"rest" appropriately for my stated experience level
- "phases" must cover the full 12 weeks with 3–4 distinct phases (not just 2). YOU decide the names, exact week ranges, and what each phase is for — design them around MY actual goal, experience level and timeline from questions 4–6. A complete beginner needs different phases than someone returning from a break or training for performance; don't reuse a generic Foundation/Build/Intensify/Deload template unless that's genuinely the right structure for me
- "progressions" must include one entry per phase (so 3–4 entries total, "phase" matching each phase name exactly), each with 2–4 concrete, actionable points: specific load increases, rep/set changes, or technique progressions for that phase — not one vague sentence for the whole block
- "warmup.steps" must have 4–6 steps, including at least one activation drill or mobility step tailored to whatever I described in question 10 (e.g. if I mentioned a knee or shoulder issue, include a warm-up step for that area specifically)
- "recipes" must have real week-to-week variety, not just one day's worth: generate at least 5 different recipes for EACH meal moment I actually eat (Breakfast, Lunch, Dinner, Snack at minimum; add Pre-workout/Post-workout if relevant to my goal) — roughly 25–35 recipes total, so I'm not eating the exact same meals every few days. Respect any allergies, intolerances, or disliked foods I mentioned, and keep them realistic for the cooking time I said I have. Any single day's combination of recipes should be able to roughly hit my "nutrition" targets
- Build "shoppingList" by aggregating the ingredients across all "recipes" into a few sensible categories (e.g. Protein, Carbs, Vegetables & fruit, Dairy, Pantry & other) so I can shop from one list

Start the interview now.`;

export default function Onboarding() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const existingName = useStore((s) => s.userName);
  const setUserName = useStore((s) => s.setUserName);
  const setUserConfig = useStore((s) => s.setUserConfig);

  // Re-entering from Settings → "Generate plan with AI" already has a name
  // on file, so skip straight to the prompt step instead of asking again.
  useEffect(() => {
    if (existingName) setStep(1);
  }, [existingName]);

  function handleNameSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setStep(1);
  }

  function handleSkip() {
    if (existingName) setUserName(existingName);
    else if (name.trim()) setUserName(name.trim());
    else setUserName("there");
    setUserConfig(buildDefaultConfig());
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text in textarea
    }
  }

  function handleImport() {
    setError(null);
    let parsed: unknown;
    const clean = extractJson(json);
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      setError(
        `Could not parse JSON. Make sure you copied only the JSON block the AI gave you.\n\nDetails: ${describeParseError(clean, e)}`
      );
      return;
    }
    const err = validateConfig(parsed);
    if (err) {
      setError(`Invalid plan: ${err}. Ask the AI to regenerate the JSON block.`);
      return;
    }
    const config = parsed as UserConfig;
    setUserConfig({
      ...config,
      recipes: config.recipes ?? [],
      shoppingList: config.shoppingList ?? [],
    });
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

      {/* Step 1: Copy the AI prompt */}
      {step === 1 && (
        <div>
          <p className="label mb-1">Build your plan</p>
          <h1 className="font-display text-4xl mb-2">Chat with an AI assistant</h1>
          <p className="text-sm text-muted mb-6">
            Copy the prompt below and paste it into any AI chat assistant you already use — Claude, ChatGPT, Gemini, or similar.
            It will run a full intake interview and generate your personalised training and nutrition plan.
          </p>

          <div className="relative">
            <textarea
              readOnly
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted font-mono resize-none focus:outline-none"
              rows={8}
              value={AI_PROMPT}
            />
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-surface-2 border border-line px-3 py-1.5 text-xs transition hover:border-accent hover:text-accent"
            >
              {copied ? <Check size={13} className="text-good" /> : <ClipboardCopy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <button
            className="btn mt-3 w-full flex items-center justify-center gap-2"
            onClick={() => setStep(2)}
          >
            I have my JSON <ArrowRight size={16} />
          </button>

          <button
            className="btn-ghost mt-2 w-full text-sm"
            onClick={handleSkip}
          >
            Skip for now — use a generic starter plan
          </button>
        </div>
      )}

      {/* Step 2: Paste JSON */}
      {step === 2 && (
        <div>
          <p className="label mb-1">Almost done</p>
          <h1 className="font-display text-4xl mb-2">Import your plan</h1>
          <p className="text-sm text-muted mb-6">
            Paste the JSON block the AI gave you at the end of your conversation.
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
              <span className="whitespace-pre-wrap break-words">{error}</span>
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
