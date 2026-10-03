/**
 * useAppData.ts
 * Central data hook. All components should use this instead of
 * individual useLocalStorage calls.
 *
 * Responsibilities:
 * - Load AppData from localStorage on mount (with migration)
 * - Write to localStorage on every change (no delay)
 * - Schedule debounced server sync when authenticated
 * - Handle login: compare local vs server updatedAt, pick newer
 * - Handle logout: keep current data, stop syncing
 * - Detect online/offline
 * - Expose syncStatus for UI
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { AppData, SyncState } from "../types/appData";
import { DEFAULT_SYNC_STATE } from "../types/appData";
import { loadLocalData, saveLocalData } from "../services/localDataStorage";
import { fetchServerData, putServerData } from "../services/dataApi";
import { migrateAppData, pickNewer } from "../data/migrations";
import { now } from "../data/defaultAppData";

const DEBOUNCE_MS = 1000;

export interface UseAppDataReturn {
  data: AppData;
  sync: SyncState;
  isLoading: boolean;
  updateData: (updater: (prev: AppData) => AppData) => void;
  updateSection: <K extends keyof AppData>(key: K, value: AppData[K]) => void;
  syncNow: () => Promise<void>;
}

export function useAppData(isAuthenticated: boolean): UseAppDataReturn {
  const [data, setData] = useState<AppData>(() => loadLocalData());
  const [sync, setSync] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Refs to avoid stale closures in async callbacks
  const dataRef = useRef(data);
  dataRef.current = data;
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const isAuthRef = useRef(isAuthenticated);
  isAuthRef.current = isAuthenticated;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInProgress = useRef(false);
  const initialLoginDone = useRef(false);

  // ─── Online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isAuthRef.current && !syncInProgress.current) {
        void performSync(dataRef.current);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSync((s) => ({ ...s, status: "offline", pendingSync: true }));
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sync implementation ───────────────────────────────────────────────────
  const performSync = useCallback(async (localData: AppData): Promise<void> => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    setSync((s) => ({ ...s, status: "syncing" }));

    try {
      const result = await putServerData(localData, syncRef.current.lastServerUpdatedAt);

      if (result.ok) {
        setSync({
          status: "synced",
          lastSyncedAt: now(),
          lastServerUpdatedAt: result.updatedAt,
          pendingSync: false,
        });
      } else if (result.conflict) {
        // Server has newer data — apply last-write-wins
        const serverData = migrateAppData(result.serverData);
        const winner = pickNewer(localData, serverData);

        if (winner === serverData) {
          // Server won — update local
          saveLocalData(serverData);
          setData(serverData);
          setSync({
            status: "synced",
            lastSyncedAt: now(),
            lastServerUpdatedAt: result.serverUpdatedAt,
            pendingSync: false,
          });
        } else {
          // Local won — re-send with new base
          const retry = await putServerData(winner, result.serverUpdatedAt);
          if (retry.ok) {
            setSync({
              status: "synced",
              lastSyncedAt: now(),
              lastServerUpdatedAt: retry.updatedAt,
              pendingSync: false,
            });
          } else {
            setSync((s) => ({ ...s, status: "error", pendingSync: true, errorMessage: "Konflikt danych — nie udało się zsynchronizować." }));
          }
        }
      } else {
        setSync((s) => ({ ...s, status: "error", pendingSync: true, errorMessage: result.error }));
      }
    } catch (e) {
      const isOffline = !navigator.onLine;
      setSync((s) => ({
        ...s,
        status: isOffline ? "offline" : "error",
        pendingSync: true,
        errorMessage: isOffline ? undefined : String(e),
      }));
    } finally {
      syncInProgress.current = false;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── On login: compare local vs server, pick newer ─────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      initialLoginDone.current = false;
      return;
    }
    if (initialLoginDone.current) return;
    initialLoginDone.current = true;

    setIsLoading(true);
    setSync((s) => ({ ...s, status: "syncing" }));

    fetchServerData()
      .then((res) => {
        const localData = dataRef.current;

        if (!res.data) {
          // No server data — push local
          void performSync(localData);
          return;
        }

        const serverData = migrateAppData(res.data);
        const winner = pickNewer(localData, serverData);

        if (winner !== localData) {
          saveLocalData(winner);
          setData(winner);
        }

        setSync({
          status: "synced",
          lastSyncedAt: now(),
          lastServerUpdatedAt: res.updatedAt,
          pendingSync: false,
        });

        // If local was newer, push it to server
        if (winner === localData) {
          void performSync(localData);
        }
      })
      .catch(() => {
        setSync((s) => ({
          ...s,
          status: navigator.onLine ? "error" : "offline",
          pendingSync: true,
        }));
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, performSync]);

  // ─── Update data ───────────────────────────────────────────────────────────
  const updateData = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater({ ...prev, updatedAt: now() });
      // 1. Save locally immediately
      saveLocalData(next);
      // 2. Schedule server sync if authenticated
      if (isAuthRef.current) {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        setSync((s) => ({ ...s, status: "saving", pendingSync: true }));
        debounceTimer.current = setTimeout(() => {
          void performSync(next);
        }, DEBOUNCE_MS);
      }
      return next;
    });
  }, [performSync]);

  const updateSection = useCallback(<K extends keyof AppData>(
    key: K,
    value: AppData[K],
  ) => {
    updateData((prev) => ({ ...prev, [key]: value }));
  }, [updateData]);

  const syncNow = useCallback(async () => {
    if (isAuthRef.current) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      await performSync(dataRef.current);
    }
  }, [performSync]);

  return { data, sync, isLoading, updateData, updateSection, syncNow };
}
