/**
 * migrations.ts
 * Centralna logika migracji danych AppData.
 * Obsługuje stare klucze localStorage, stary format serwera,
 * hackowe użycie pola motivationalLabel oraz braki pól.
 */

import type { AppData } from "../types/appData";
import { SCHEMA_VERSION } from "../types/appData";
import { AppDataSchema, safeParse } from "../schemas/appDataSchemas";
import { createDefaultAppData, now } from "./defaultAppData";
import type {
  Workout, WeekRecord, WeekReflection, KeyDate,
  TrainingDataItem, BodyMeasurement, NoteItem, ReminderSettings,
  TrainingDataEntry,
} from "../types/workout";
import { DEFAULT_REMINDER_SETTINGS } from "../types/workout";
import type { TrainingProgram } from "../types/program";

// ─── Old localStorage key names ───────────────────────────────────────────────

const OLD_KEYS = {
  workouts:          "planer-treningow",
  history:           "planer-historia",
  reflection:        "planer-refleksja",
  reflectionCount:   "planer-reflection-count",
  keyDates:          "planer-key-dates",
  trainingData:      "planer-training-data",
  bodyMeasurements:  "planer-body-measurements",
  notes:             "planer-notes",
  reminderSettings:  "planer-reminder-settings",
  program:           "planer-program",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readLsJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Migrate old TrainingDataItem format: { value, note } → { entries: [{ value, note, date }] } */
function migrateTrainingData(raw: unknown[]): TrainingDataItem[] {
  return raw.map((item) => {
    const it = item as Record<string, unknown>;
    if (Array.isArray(it.entries)) return it as unknown as TrainingDataItem;
    const entry: TrainingDataEntry = {
      value: (it.value as string) ?? "",
      note: it.note as string | undefined,
      date: new Date().toISOString(),
    };
    return { id: it.id as string, name: it.name as string, entries: [entry] };
  });
}

/**
 * Try to extract KeyDate[] from motivationalLabel string.
 * The label may contain JSON-encoded KeyDate[] (legacy hack) or plain text.
 */
export function extractKeyDatesFromMotivationalLabel(label: string | null | undefined): KeyDate[] {
  if (!label) return [];
  try {
    const parsed = JSON.parse(label);
    if (!Array.isArray(parsed)) return [];
    // Validate that each item looks like a KeyDate
    const candidates = parsed.filter(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.date === "string",
    );
    return candidates as KeyDate[];
  } catch {
    return [];
  }
}

/** Merge two KeyDate arrays by id (or name+date), no duplicates. */
function mergeKeyDates(a: KeyDate[], b: KeyDate[]): KeyDate[] {
  const seen = new Set<string>();
  const result: KeyDate[] = [];
  for (const kd of [...a, ...b]) {
    const key = kd.id || `${kd.name}::${kd.date}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(kd);
    }
  }
  return result;
}

// ─── Migration from old server format ─────────────────────────────────────────

/**
 * Build AppData from the old server row shape:
 *   { currentWorkouts, historyEntries, currentReflection, reflectionShownCount,
 *     motivationalDate, motivationalLabel }
 */
function migrateFromServerV1(raw: Record<string, unknown>): AppData {
  const workouts = Array.isArray(raw.currentWorkouts)
    ? (raw.currentWorkouts as Workout[])
    : [];

  const history = Array.isArray(raw.historyEntries)
    ? (raw.historyEntries as WeekRecord[])
    : [];

  const reflection = (raw.currentReflection as WeekReflection | null) ?? null;

  const reflectionShownCount =
    typeof raw.reflectionShownCount === "number"
      ? raw.reflectionShownCount
      : parseInt(String(raw.reflectionShownCount ?? "0"), 10) || 0;

  // motivationalLabel may contain JSON-encoded KeyDate[]
  const keyDatesFromLabel = extractKeyDatesFromMotivationalLabel(
    raw.motivationalLabel as string | null,
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now(),
    currentWeek: { workouts, reflection, reflectionShownCount },
    history,
    keyDates: keyDatesFromLabel,
    trainingData: [],
    bodyMeasurements: [],
    notes: [],
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
    trainingProgram: null,
  };
}

// ─── Migration from old localStorage keys ─────────────────────────────────────

/**
 * Build AppData by reading all legacy separate localStorage keys.
 * Call this only when "planer-app-data" doesn't exist yet.
 */
export function migrateFromOldLocalStorageKeys(): AppData {
  const workouts = readLsJson<Workout[]>(OLD_KEYS.workouts) ?? [];
  const history = readLsJson<WeekRecord[]>(OLD_KEYS.history) ?? [];
  const reflection = readLsJson<WeekReflection | null>(OLD_KEYS.reflection) ?? null;
  const reflectionCount = readLsJson<number>(OLD_KEYS.reflectionCount) ?? 0;
  const keyDates = readLsJson<KeyDate[]>(OLD_KEYS.keyDates) ?? [];
  const rawTrainingData = readLsJson<unknown[]>(OLD_KEYS.trainingData) ?? [];
  const bodyMeasurements = readLsJson<BodyMeasurement[]>(OLD_KEYS.bodyMeasurements) ?? [];
  const notes = readLsJson<NoteItem[]>(OLD_KEYS.notes) ?? [];
  const reminderSettings = readLsJson<ReminderSettings>(OLD_KEYS.reminderSettings) ?? { ...DEFAULT_REMINDER_SETTINGS };
  const trainingProgram = readLsJson<TrainingProgram | null>(OLD_KEYS.program) ?? null;

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: now(),
    currentWeek: {
      workouts,
      reflection,
      reflectionShownCount: typeof reflectionCount === "number" ? reflectionCount : 0,
    },
    history,
    keyDates,
    trainingData: migrateTrainingData(rawTrainingData),
    bodyMeasurements,
    notes,
    reminderSettings: {
      ...DEFAULT_REMINDER_SETTINGS,
      ...reminderSettings,
    },
    trainingProgram,
  };
}

// ─── Main migration entry point ───────────────────────────────────────────────

/**
 * Normalize any unknown data shape into a valid AppData.
 * - Handles null/undefined → returns default
 * - Handles schemaVersion 2 (current) → validates, fills defaults
 * - Handles old server format (currentWorkouts / historyEntries) → migrates
 * - Handles partial data → fills missing sections with defaults
 * - Handles motivationalLabel containing KeyDate[] JSON → extracts to keyDates
 */
export function migrateAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") {
    return createDefaultAppData();
  }

  const obj = raw as Record<string, unknown>;

  // Already current schema version — validate and fill defaults
  if (obj.schemaVersion === SCHEMA_VERSION) {
    const parsed = safeParse(AppDataSchema, raw, "migrateAppData v2");
    if (parsed) return parsed;
    // If Zod fails, fall through to partial recovery below
  }

  // Old server format (no schemaVersion, has currentWorkouts)
  if ("currentWorkouts" in obj || "historyEntries" in obj) {
    return migrateFromServerV1(obj);
  }

  // Partial v2-like document (has some AppData fields but missing schemaVersion)
  // Attempt partial recovery: build from what we have
  const defaults = createDefaultAppData();

  const currentWeekRaw = obj.currentWeek as Record<string, unknown> | undefined;
  const workouts = Array.isArray(currentWeekRaw?.workouts)
    ? (currentWeekRaw!.workouts as Workout[])
    : Array.isArray(obj.workouts) // some old intermediate formats
      ? (obj.workouts as Workout[])
      : defaults.currentWeek.workouts;

  const history = Array.isArray(obj.history)
    ? (obj.history as WeekRecord[])
    : defaults.history;

  const keyDatesRaw = Array.isArray(obj.keyDates)
    ? (obj.keyDates as KeyDate[])
    : defaults.keyDates;

  // Also check motivationalLabel for KeyDate[] in case this is a hybrid shape
  const extraKeyDates = extractKeyDatesFromMotivationalLabel(
    obj.motivationalLabel as string | null,
  );
  const keyDates = mergeKeyDates(keyDatesRaw, extraKeyDates);

  const trainingDataRaw = Array.isArray(obj.trainingData)
    ? migrateTrainingData(obj.trainingData)
    : defaults.trainingData;

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: (typeof obj.updatedAt === "string" && obj.updatedAt) ? obj.updatedAt : now(),
    currentWeek: {
      workouts,
      reflection: (currentWeekRaw?.reflection as WeekReflection | null | undefined) ?? null,
      reflectionShownCount:
        typeof currentWeekRaw?.reflectionShownCount === "number"
          ? currentWeekRaw.reflectionShownCount
          : 0,
    },
    history,
    keyDates,
    trainingData: trainingDataRaw,
    bodyMeasurements: Array.isArray(obj.bodyMeasurements)
      ? (obj.bodyMeasurements as BodyMeasurement[])
      : defaults.bodyMeasurements,
    notes: Array.isArray(obj.notes)
      ? (obj.notes as NoteItem[])
      : defaults.notes,
    reminderSettings: (obj.reminderSettings && typeof obj.reminderSettings === "object")
      ? { ...DEFAULT_REMINDER_SETTINGS, ...(obj.reminderSettings as Partial<ReminderSettings>) }
      : defaults.reminderSettings,
    trainingProgram: (obj.trainingProgram && typeof obj.trainingProgram === "object")
      ? (obj.trainingProgram as TrainingProgram)
      : defaults.trainingProgram,
  };
}

/**
 * Compare two AppData and return the newer one based on updatedAt.
 * If dates are equal, prefers `a`.
 */
export function pickNewer(a: AppData, b: AppData): AppData {
  const ta = new Date(a.updatedAt).getTime();
  const tb = new Date(b.updatedAt).getTime();
  return tb > ta ? b : a;
}
