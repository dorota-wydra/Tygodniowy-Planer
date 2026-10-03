/**
 * localDataStorage.ts
 * Thin wrapper around localStorage for AppData.
 * Handles migration from legacy separate keys on first access.
 */

import type { AppData } from "../types/appData";
import { LOCAL_STORAGE_KEY, BACKUP_KEY } from "../types/appData";
import { migrateAppData, migrateFromOldLocalStorageKeys } from "../data/migrations";
import { createDefaultAppData, now } from "../data/defaultAppData";

const MIGRATION_DONE_KEY = "planer-migration-v2-done";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasOldData(): boolean {
  return !!(
    localStorage.getItem("planer-treningow") ||
    localStorage.getItem("planer-historia") ||
    localStorage.getItem("planer-program") ||
    localStorage.getItem("planer-notes")
  );
}

function saveMigrationBackup(data: object): void {
  try {
    if (!localStorage.getItem(BACKUP_KEY)) {
      localStorage.setItem(
        BACKUP_KEY,
        JSON.stringify({ migratedAt: now(), data }),
      );
    }
  } catch {
    // storage full — skip backup
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load AppData from localStorage. Performs migration from old keys if needed. */
export function loadLocalData(): AppData {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return migrateAppData(parsed);
    } catch {
      if (import.meta.env.DEV) {
        console.warn("[localDataStorage] Failed to parse planer-app-data, falling back.");
      }
    }
  }

  // No new key yet — try legacy keys
  const migrationDone = localStorage.getItem(MIGRATION_DONE_KEY) === "true";

  if (!migrationDone && hasOldData()) {
    const migrated = migrateFromOldLocalStorageKeys();
    saveMigrationBackup(migrated);
    saveLocalData(migrated);
    localStorage.setItem(MIGRATION_DONE_KEY, "true");
    return migrated;
  }

  // Fresh install
  return createDefaultAppData();
}

/** Save AppData to localStorage. */
export function saveLocalData(data: AppData): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[localDataStorage] Failed to save:", e);
    }
  }
}

/** Read the pre-migration backup (for debugging / recovery). */
export function readMigrationBackup(): unknown | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
