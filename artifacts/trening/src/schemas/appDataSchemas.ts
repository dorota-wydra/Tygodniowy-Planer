import { z } from "zod";
import { SCHEMA_VERSION } from "../types/appData";

// ─── Workout ──────────────────────────────────────────────────────────────────

const DayOfWeekSchema = z.enum([
  "Poniedziałek", "Wtorek", "Środa", "Czwartek",
  "Piątek", "Sobota", "Niedziela",
]);

const WorkoutTypeSchema = z.enum([
  "siła", "joga", "rozciaganie", "mobility",
  "bieg", "bieg_latwy", "bieg_dlugi", "bieg_jakosciowy",
  "zabawa_biegowa", "rower", "spacer", "relaksacja", "inne",
  "joga_rozciaganie",
]);

const IntensityLevelSchema = z.enum(["lekki", "umiarkowany", "ciężki", "regeneracja"]);

export const WorkoutSchema = z.object({
  id: z.string(),
  day: DayOfWeekSchema,
  type: WorkoutTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  completed: z.boolean(),
  notes: z.string().optional(),
  plannedTime: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderOffsetMinutes: z.number().optional(),
  skipped: z.boolean().optional(),
  movedFrom: DayOfWeekSchema.optional(),
  missed: z.boolean().optional(),
  missedReason: z.string().optional(),
  intensity: IntensityLevelSchema.optional(),
  distance: z.string().optional(),
  duration: z.string().optional(),
  reps: z.string().optional(),
  pace: z.string().optional(),
  heartRate: z.string().optional(),
  weight: z.string().optional(),
  customNotes: z.string().optional(),
  warmup: z.string().optional(),
  mainStage: z.string().optional(),
  cooldown: z.string().optional(),
});

export const WeekReflectionSchema = z.object({
  q1: z.string(),
  q2: z.string(),
  q3: z.string(),
});

export const WeekRecordSchema = z.object({
  id: z.string(),
  weekLabel: z.string(),
  savedAt: z.string(),
  workouts: z.array(WorkoutSchema),
  reflection: WeekReflectionSchema.optional(),
  rating: z.number().optional(),
  weekNote: z.string().optional(),
});

export const KeyDateSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  description: z.string().optional(),
});

// ─── Training data ────────────────────────────────────────────────────────────

export const TrainingDataEntrySchema = z.object({
  value: z.string(),
  note: z.string().optional(),
  date: z.string(),
});

export const TrainingDataItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  entries: z.array(TrainingDataEntrySchema),
});

export const BodyMeasurementSchema = z.object({
  id: z.string(),
  date: z.string(),
  weight: z.string().optional(),
  waist: z.string().optional(),
  hips: z.string().optional(),
  thigh: z.string().optional(),
  arm: z.string().optional(),
  note: z.string().optional(),
});

export const NoteItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const ReminderSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  defaultReminderTime: z.string(),
  defaultReminderOffsetMinutes: z.number(),
  eveningReminderEnabled: z.boolean(),
  eveningReminderTime: z.string(),
  disabledTypes: z.array(WorkoutTypeSchema),
});

// ─── Training plan (legacy) ───────────────────────────────────────────────────

const TrainingPlanEntrySchema = z.object({
  id: z.string(),
  type: WorkoutTypeSchema,
  name: z.string(),
  description: z.string().optional(),
});

const WeeklyTemplateSchema = z.record(z.array(TrainingPlanEntrySchema));

const CycleWeekSchema = z.object({
  id: z.string(),
  intensity: IntensityLevelSchema,
  notes: z.string().optional(),
});

export const TrainingPlanSchema = z.object({
  weeklyTemplate: WeeklyTemplateSchema,
  generalNotes: z.string(),
  cycleWeeks: z.array(CycleWeekSchema),
  cycleStartDate: z.string().optional(),
});

// ─── Training program ─────────────────────────────────────────────────────────

const CycleColorKeySchema = z.enum([
  "sky", "emerald", "amber", "rose", "violet", "teal", "orange", "indigo",
]);

export const PlannedWorkoutSchema = z.object({
  id: z.string(),
  day: DayOfWeekSchema,
  type: WorkoutTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  intensity: IntensityLevelSchema.optional(),
  distance: z.string().optional(),
  duration: z.string().optional(),
  reps: z.string().optional(),
  pace: z.string().optional(),
  heartRate: z.string().optional(),
  weight: z.string().optional(),
  customNotes: z.string().optional(),
});

const ProgramWeekSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  goal: z.string().optional(),
  info: z.string().optional(),
  notes: z.string().optional(),
  workouts: z.array(PlannedWorkoutSchema),
});

const ProgramCycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: CycleColorKeySchema,
  goal: z.string().optional(),
  description: z.string().optional(),
  info: z.string().optional(),
  notes: z.string().optional(),
  weeks: z.array(ProgramWeekSchema),
});

export const TrainingProgramSchema = z.object({
  name: z.string(),
  goal: z.string().optional(),
  description: z.string().optional(),
  generalNotes: z.string().optional(),
  dateMode: z.enum(["start", "end"]),
  anchorDate: z.string().optional(),
  cycles: z.array(ProgramCycleSchema),
});

// ─── AppData ──────────────────────────────────────────────────────────────────

export const AppCurrentWeekSchema = z.object({
  workouts: z.array(WorkoutSchema).default([]),
  reflection: WeekReflectionSchema.nullable().default(null),
  reflectionShownCount: z.number().default(0),
});

export const AppDataSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  updatedAt: z.string(),
  currentWeek: AppCurrentWeekSchema.default({ workouts: [], reflection: null, reflectionShownCount: 0 }),
  history: z.array(WeekRecordSchema).default([]),
  keyDates: z.array(KeyDateSchema).default([]),
  trainingData: z.array(TrainingDataItemSchema).default([]),
  bodyMeasurements: z.array(BodyMeasurementSchema).default([]),
  notes: z.array(NoteItemSchema).default([]),
  reminderSettings: ReminderSettingsSchema.default({
    remindersEnabled: false,
    defaultReminderTime: "08:00",
    defaultReminderOffsetMinutes: 30,
    eveningReminderEnabled: true,
    eveningReminderTime: "20:00",
    disabledTypes: [],
  }),
  trainingProgram: TrainingProgramSchema.nullable().default(null),
});

// ─── Partial validation helpers ───────────────────────────────────────────────

/** Safe parse — returns null on failure, logs in dev */
export function safeParse<S extends z.ZodTypeAny>(schema: S, raw: unknown, label?: string): z.output<S> | null {
  const result = schema.safeParse(raw);
  if (!result.success) {
    if (import.meta.env.DEV) {
      console.warn(`[AppData] validation warning${label ? ` (${label})` : ""}:`, result.error.flatten());
    }
    return null;
  }
  return result.data as z.output<S>;
}

/** Parse with fallback — returns fallback on failure */
export function parseOrDefault<S extends z.ZodTypeAny>(schema: S, raw: unknown, fallback: z.output<S>, label?: string): z.output<S> {
  return safeParse(schema, raw, label) ?? fallback;
}
