export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  core?: boolean;
};

export type Session = {
  id: string;
  name: string;
  focus: string;
  postCardio?: string;
  exercises: Exercise[];
  /** Travel session (no gym / hotel): listed separately, doesn't count for the split */
  travel?: boolean;
  /** Equipment needed, for the chip in the list ("no equipment", "dumbbells"...) */
  equipment?: string;
  /** Own warmup (e.g. for travel, no stationary bike). Falls back to the plan's warmup if missing. */
  warmup?: {
    duration: string;
    note: string;
    steps: { exercise: string; detail: string }[];
  };
};

export type Phase = { name: string; weeks: string; goal: string; rpe: string };

export type Plan = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  startingWeight: number;
  targetWeight: number;
  frequency: string;
  structure: string;
  summary: string;
  phases: Phase[];
  weeklySplit: { day: string; session: string }[];
  splitNote: string;
  warmup: {
    duration: string;
    note: string;
    steps: { exercise: string; detail: string }[];
  };
  sessions: Session[];
  progressions: { phase: string; points: string[] }[];
  safetyNote: string;
};

// --- Local records (IndexedDB / localStorage) ---

export type SetLog = { kg: number | ""; reps: number | "" };

export type ExerciseLog = {
  name: string;
  sets: SetLog[];
};

export type WorkoutLog = {
  id: string;
  date: string; // ISO
  sessionId: string;
  sessionName: string;
  exercises: ExerciseLog[];
  rpe: number | null;
  soreness: number | null; // 1 (bad) - 5 (perfect): how the body felt overall, not tied to any one body part
  notes: string;
};

// In-progress workout, persisted so it survives the phone unloading the tab
// in the background (switching app, low memory, long scroll away...)
export type WorkoutDraft = {
  sessionId: string;
  phase: "warmup" | "work";
  warm: boolean[];
  logs: ExerciseLog[];
  rpe: number;
  soreness: number;
  notes: string;
  startedAt: number | null; // Date.now() once the warmup is done
};

export type BodyLog = {
  id: string;
  date: string;
  weight: number | "";
  waist: number | "";
  hip: number | "";
  chest: number | "";
  arm: number | "";
  thigh: number | "";
  bodyFat: number | "";
  // Optional: if the weigh-in comes from a smart scale
  muscleMass?: number | "";
  visceralFat?: number | "";
  water?: number | "";
  notes: string;
};

export type Reminder = {
  id: string;
  label: string;
  body: string;
  emoji: string;
  time: string; // "HH:MM"
  enabled: boolean;
  weekday?: number | null; // 0=Sunday … 6=Saturday; null/absent = every day
  url?: string;            // where the notification leads when tapped
};

export type NutritionTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  note?: string;
};

export type Recipe = {
  id: string;
  name: string;
  moment: string; // "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Pre-workout" | "Post-workout" (free text)
  time: string; // prep time, e.g. "10 min"
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  steps: string[];
};

export type ShoppingCategory = {
  category: string;
  items: string[];
};

export type Sex = "male" | "female" | "other";
export type Goal = "lose-fat" | "build-muscle" | "recomposition" | "general-fitness" | "athletic-performance";

export type UserConfig = {
  sex?: Sex;
  goal?: Goal;
  plan: Plan;
  nutrition: NutritionTargets;
  recipes: Recipe[];
  shoppingList: ShoppingCategory[];
};

export type CycleLog = {
  id: string;
  start: string; // YYYY-MM-DD, first day of period
  flow: "light" | "medium" | "heavy" | "";
  symptoms: string[];
  notes: string;
};

// Meal logged outside the recipe book (catalog, hand-portion estimate, or generic)
export type FreeMeal = {
  id: string;
  name: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
};

export type NutritionLog = {
  date: string; // YYYY-MM-DD (one per day)
  proteinGoalMet: boolean;
  ateOut: boolean;
  hydrationGoalMet: boolean;
  sleepGoalMet: boolean;
  craving: boolean;
  cleanDay: boolean;
  notes: string;
};
