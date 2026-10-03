export type DayOfWeek =
  | "Poniedziałek"
  | "Wtorek"
  | "Środa"
  | "Czwartek"
  | "Piątek"
  | "Sobota"
  | "Niedziela";

export type WorkoutType =
  | "siła"
  | "joga"
  | "rozciaganie"
  | "mobility"
  | "bieg"
  | "bieg_latwy"
  | "bieg_dlugi"
  | "bieg_jakosciowy"
  | "zabawa_biegowa"
  | "rower"
  | "spacer"
  | "relaksacja"
  | "inne"
  | "joga_rozciaganie";

export interface Workout {
  id: string;
  day: DayOfWeek;
  type: WorkoutType;
  name: string;
  description?: string;
  completed: boolean;
  notes?: string;
  plannedTime?: string;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: number;
  skipped?: boolean;
  movedFrom?: DayOfWeek;
  missed?: boolean;
  missedReason?: string;
  intensity?: IntensityLevel;
  distance?: string;
  duration?: string;
  reps?: string;
  pace?: string;
  heartRate?: string;
  weight?: string;
  customNotes?: string;
  warmup?: string;
  mainStage?: string;
  cooldown?: string;
}

export interface WeekReflection {
  q1: string;
  q2: string;
  q3: string;
}

export interface WeekRecord {
  id: string;
  weekLabel: string;
  savedAt: string;
  workouts: Workout[];
  reflection?: WeekReflection;
  rating?: number;
  weekNote?: string;
}

export interface KeyDate {
  id: string;
  name: string;
  date: string;
  description?: string;
}

export interface TrainingDataEntry {
  value: string;
  note?: string;
  date: string;
}

export interface TrainingDataItem {
  id: string;
  name: string;
  entries: TrainingDataEntry[];
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  weight?: string;
  waist?: string;
  hips?: string;
  thigh?: string;
  arm?: string;
  note?: string;
}

export interface ReminderSettings {
  remindersEnabled: boolean;
  defaultReminderTime: string;
  defaultReminderOffsetMinutes: number;
  eveningReminderEnabled: boolean;
  eveningReminderTime: string;
  disabledTypes: WorkoutType[];
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  remindersEnabled: false,
  defaultReminderTime: "08:00",
  defaultReminderOffsetMinutes: 30,
  eveningReminderEnabled: true,
  eveningReminderTime: "20:00",
  disabledTypes: [],
};

// ─── Training Plan ──────────────────────────────────────────────────────────

export interface TrainingPlanEntry {
  id: string;
  type: WorkoutType;
  name: string;
  description?: string;
}

export type WeeklyTemplate = Record<DayOfWeek, TrainingPlanEntry[]>;

// Multi-week cycle
export type IntensityLevel = "lekki" | "umiarkowany" | "ciężki" | "regeneracja";

export const INTENSITY_CONFIG: Record<IntensityLevel, { label: string; badgeCls: string; barCls: string; textCls: string }> = {
  lekki:       { label: "Lekki",       badgeCls: "bg-green-100 text-green-700",   barCls: "bg-green-400",  textCls: "text-green-700"  },
  umiarkowany: { label: "Umiarkowany", badgeCls: "bg-blue-100 text-blue-700",     barCls: "bg-blue-400",   textCls: "text-blue-700"   },
  ciężki:      { label: "Ciężki",      badgeCls: "bg-orange-100 text-orange-700", barCls: "bg-orange-500", textCls: "text-orange-700" },
  regeneracja: { label: "Regeneracja", badgeCls: "bg-purple-100 text-purple-700", barCls: "bg-purple-400", textCls: "text-purple-700" },
};

export interface CycleWeek {
  id: string;
  intensity: IntensityLevel;
  notes?: string;
}

export interface TrainingPlan {
  weeklyTemplate: WeeklyTemplate;
  generalNotes: string;
  cycleWeeks: CycleWeek[];
  cycleStartDate?: string; // ISO date string — Monday of week 1
}

export function createEmptyPlan(): TrainingPlan {
  const weeklyTemplate = {} as WeeklyTemplate;
  for (const d of DAYS_OF_WEEK) weeklyTemplate[d] = [];
  return { weeklyTemplate, generalNotes: "", cycleWeeks: [] };
}

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];
