import type {
  Workout,
  WeekReflection,
  WeekRecord,
  KeyDate,
  TrainingDataItem,
  BodyMeasurement,
  NoteItem,
  ReminderSettings,
} from "./workout";
import type { TrainingProgram } from "./program";

export const SCHEMA_VERSION = 2;
export const LOCAL_STORAGE_KEY = "planer-app-data";
export const BACKUP_KEY = "planer-pre-migration-backup-v1";

// ─── Core structure ───────────────────────────────────────────────────────────

export interface AppCurrentWeek {
  workouts: Workout[];
  reflection: WeekReflection | null;
  reflectionShownCount: number;
}

export interface AppData {
  schemaVersion: number;
  updatedAt: string; // ISO 8601
  currentWeek: AppCurrentWeek;
  history: WeekRecord[];
  keyDates: KeyDate[];
  trainingData: TrainingDataItem[];
  bodyMeasurements: BodyMeasurement[];
  notes: NoteItem[];
  reminderSettings: ReminderSettings;
  trainingProgram: TrainingProgram | null;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export type SyncStatus =
  | "idle"
  | "saving"
  | "saved"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "conflict";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastServerUpdatedAt: string | null;
  pendingSync: boolean;
  errorMessage?: string;
}

export const DEFAULT_SYNC_STATE: SyncState = {
  status: "idle",
  lastSyncedAt: null,
  lastServerUpdatedAt: null,
  pendingSync: false,
};

// ─── API shapes ───────────────────────────────────────────────────────────────

export interface ApiGetDataResponse {
  data: AppData | null;
  updatedAt: string | null;
}

export interface ApiPutDataRequest {
  data: AppData;
  clientUpdatedAt: string;
  baseServerUpdatedAt?: string | null;
}

export interface ApiPutDataResponse {
  data: AppData;
  updatedAt: string;
}

export interface ApiConflictResponse {
  conflict: true;
  serverData: AppData;
  serverUpdatedAt: string;
}
