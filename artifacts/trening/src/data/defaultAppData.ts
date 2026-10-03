import type { AppData } from "../types/appData";
import { SCHEMA_VERSION } from "../types/appData";
import { DEFAULT_REMINDER_SETTINGS } from "../types/workout";

export function now(): string {
  return new Date().toISOString();
}

export function createDefaultAppData(updatedAt?: string): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    // Use epoch (far past) when no real timestamp given, so fresh/empty local data
    // never beats real server data in pickNewer() comparisons.
    updatedAt: updatedAt ?? new Date(0).toISOString(),
    currentWeek: {
      workouts: [],
      reflection: null,
      reflectionShownCount: 0,
    },
    history: [],
    keyDates: [],
    trainingData: [],
    bodyMeasurements: [],
    notes: [],
    reminderSettings: { ...DEFAULT_REMINDER_SETTINGS },
    trainingProgram: null,
  };
}
