export type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  core?: boolean;
  lowerBack?: boolean;
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
  lowerBack: number | null; // 1 (bad) - 5 (perfect)
  notes: string;
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

export type UserConfig = {
  plan: Plan;
  nutrition: NutritionTargets;
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
