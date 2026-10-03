import { useEffect, useRef, useCallback } from "react";

export interface PlannerData {
  currentWorkouts: unknown[];
  historyEntries: unknown[];
  currentReflection: unknown | null;
  reflectionShownCount: number;
  motivationalDate: string | null;
  motivationalLabel: string | null;
}

const API_BASE = "/api";

async function fetchUserData(): Promise<PlannerData> {
  const res = await fetch(`${API_BASE}/data`, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function saveUserData(data: PlannerData): Promise<void> {
  await fetch(`${API_BASE}/data`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function useRemoteSync(
  isAuthenticated: boolean,
  data: PlannerData,
  onLoad: (data: PlannerData) => void,
) {
  const initialLoadDone = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (initialLoadDone.current) return;

    fetchUserData()
      .then((remoteData) => {
        initialLoadDone.current = true;
        onLoad(remoteData);
      })
      .catch(() => {
        initialLoadDone.current = true;
      });
  }, [isAuthenticated, onLoad]);

  const scheduleSave = useCallback(
    (payload: PlannerData) => {
      if (!isAuthenticated || !initialLoadDone.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveUserData(payload).catch(() => {});
      }, 800);
    },
    [isAuthenticated],
  );

  return { scheduleSave };
}
