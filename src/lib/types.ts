export type Ejercicio = {
  nombre: string;
  series: number;
  reps: string;
  descanso: string;
  notas?: string;
  core?: boolean;
  lumbar?: boolean;
};

export type Sesion = {
  id: string;
  nombre: string;
  foco: string;
  cardioPost?: string;
  ejercicios: Ejercicio[];
  /** Sesión de viaje (sin gym / hotel): se lista aparte y no cuenta para el split */
  viaje?: boolean;
  /** Equipo necesario, para el chip de la lista ("sin material", "mancuernas"...) */
  equipo?: string;
  /** Calentamiento propio (p. ej. de viaje, sin bici estática). Si falta, se usa el del plan. */
  calentamiento?: {
    duracion: string;
    nota: string;
    pasos: { ejercicio: string; detalle: string }[];
  };
};

export type Fase = { nombre: string; semanas: string; objetivo: string; rpe: string };

export type Plan = {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  pesoInicial: number;
  pesoObjetivo: number;
  frecuencia: string;
  estructura: string;
  resumen: string;
  fases: Fase[];
  splitSemanal: { dia: string; sesion: string }[];
  notaSplit: string;
  calentamiento: {
    duracion: string;
    nota: string;
    pasos: { ejercicio: string; detalle: string }[];
  };
  sesiones: Sesion[];
  progresiones: { fase: string; puntos: string[] }[];
  reglaLumbar: string;
};

// --- Registros locales (IndexedDB / localStorage) ---

export type SetLog = { kg: number | ""; reps: number | "" };

export type EjercicioLog = {
  nombre: string;
  sets: SetLog[];
};

export type WorkoutLog = {
  id: string;
  fecha: string; // ISO
  sesionId: string;
  sesionNombre: string;
  ejercicios: EjercicioLog[];
  rpe: number | null;
  lumbar: number | null; // 1 (mal) - 5 (perfecto)
  notas: string;
};

export type BodyLog = {
  id: string;
  fecha: string;
  peso: number | "";
  cintura: number | "";
  cadera: number | "";
  pecho: number | "";
  brazo: number | "";
  muslo: number | "";
  grasa: number | "";
  // Opcionales: si el pesaje viene de la báscula inteligente
  masaMuscular?: number | "";
  visceral?: number | "";
  agua?: number | "";
  notas: string;
};

// Medición completa de la báscula (content/body/basculas.json, la mantiene el entrenador)
export type Bascula = {
  fecha: string;
  hora?: string;
  peso?: number;
  imc?: number;
  grasaPct?: number;
  masaGrasa?: number;
  tmb?: number;
  musculoPct?: number;
  masaMuscular?: number;
  agua?: number;
  proteinaPct?: number;
  osea?: number;
  visceral?: number;
  esqueletico?: number;
  subcutaneaPct?: number;
  masaSubcutanea?: number;
  fc?: number;
};

export type Reminder = {
  id: string;
  label: string;
  body: string;
  emoji: string;
  time: string; // "HH:MM"
  enabled: boolean;
  weekday?: number | null; // 0=domingo … 6=sábado; null/ausente = todos los días
  url?: string;            // a dónde lleva la notificación al tocarla
};

// Comida fuera del recetario apuntada a mano (catálogo, raciones de mano o genérica)
export type NutritionTargets = {
  kcal: number;
  proteina: number;
  carbos: number;
  grasas: number;
  nota?: string;
};

export type UserConfig = {
  plan: Plan;
  nutrition: NutritionTargets;
};

export type ComidaLibre = {
  id: string;
  nombre: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
};

export type NutricionLog = {
  fecha: string; // YYYY-MM-DD (una por día)
  proteinaOk: boolean;
  comioFuera: boolean;
  hidratacionOk: boolean;
  suenoOk: boolean;
  antojo: boolean;
  diaLimpio: boolean;
  notas: string;
};
