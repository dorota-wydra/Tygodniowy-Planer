import { useState, useEffect, useRef, useCallback } from "react";
import { Workout, ReminderSettings, DayOfWeek } from "../types/workout";

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getTodayDayName(): DayOfWeek {
  const names: DayOfWeek[] = [
    "Niedziela", "Poniedziałek", "Wtorek", "Środa",
    "Czwartek", "Piątek", "Sobota",
  ];
  return names[new Date().getDay()];
}

export function getTomorrowDayName(): DayOfWeek {
  const names: DayOfWeek[] = [
    "Niedziela", "Poniedziałek", "Wtorek", "Środa",
    "Czwartek", "Piątek", "Sobota",
  ];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return names[d.getDay()];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// ─── Shown-reminders persistence ──────────────────────────────────────────

const SHOWN_KEY = "planer-reminders-shown";

function loadShown(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (raw) return new Set<string>(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveShown(s: Set<string>): void {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...s]));
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export type NotifPermission = "granted" | "denied" | "default" | "unsupported";

export function useReminders({
  workouts,
  settings,
}: {
  workouts: Workout[];
  settings: ReminderSettings;
}) {
  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission as NotifPermission;
  });

  // Evening banner: list of uncompleted workouts to show actions for
  const [eveningWorkouts, setEveningWorkouts] = useState<Workout[]>([]);
  const [eveningSnoozedUntil, setEveningSnoozedUntil] = useState<number | null>(null);

  const shownRef = useRef<Set<string>>(loadShown());
  const permRef = useRef(permission);
  permRef.current = permission;

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result as NotifPermission);
  }, []);

  // Show a web notification (best-effort)
  const showNotification = useCallback((title: string, body: string, tag: string) => {
    if (permRef.current !== "granted") return;
    try {
      new Notification(title, {
        body,
        tag,
        icon: `${import.meta.env.BASE_URL}favicon.svg`,
        badge: `${import.meta.env.BASE_URL}favicon.svg`,
        silent: true, // don't interrupt with system sound — app has its own
      });
    } catch {}
  }, []);

  // Core check — runs every 60 s
  useEffect(() => {
    function check() {
      if (!settings.remindersEnabled) return;

      const today = getToday();
      const todayDay = getTodayDayName();
      const nowMin = currentMinutes();

      const todayActive = workouts.filter(
        (w) => w.day === todayDay && !w.completed && !w.skipped && !w.missed
      );

      // ── Before / daily reminders ──────────────────────────────────────
      for (const workout of todayActive) {
        if (settings.disabledTypes.includes(workout.type)) continue;

        let triggerMin: number;
        let rtype: string;
        let message: string;

        if (workout.plannedTime) {
          const offset =
            workout.reminderOffsetMinutes ?? settings.defaultReminderOffsetMinutes;
          triggerMin = timeToMinutes(workout.plannedTime) - offset;
          rtype = "before";
          message = `Dziś o ${workout.plannedTime} czeka Cię: ${workout.name} 💪`;
        } else {
          triggerMin = timeToMinutes(settings.defaultReminderTime);
          rtype = "daily";
          message = `Masz dziś zaplanowany trening: ${workout.name}. Spokojnie, wystarczy zacząć 🏃`;
        }

        if (triggerMin <= 0) continue;
        const key = `${workout.id}:${rtype}:${today}`;
        if (!shownRef.current.has(key) && nowMin >= triggerMin) {
          shownRef.current.add(key);
          saveShown(shownRef.current);
          showNotification("Planer treningów", message, key);
        }
      }

      // ── Evening reminder ──────────────────────────────────────────────
      if (settings.eveningReminderEnabled && todayActive.length > 0) {
        const eveningMin = timeToMinutes(settings.eveningReminderTime);
        const key = `evening:${today}`;
        const snoozed =
          eveningSnoozedUntil !== null && Date.now() < eveningSnoozedUntil;

        if (
          !shownRef.current.has(key) &&
          nowMin >= eveningMin &&
          !snoozed &&
          eveningWorkouts.length === 0
        ) {
          // Don't add to shownRef yet — only on explicit dismiss
          setEveningWorkouts([...todayActive]);
          showNotification(
            "Planer treningów",
            "Masz nieukończone treningi na dziś. Co z nimi robimy? 🌙",
            key
          );
        }
      }
    }

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [workouts, settings, showNotification, eveningWorkouts.length, eveningSnoozedUntil]);

  // Keep evening list in sync as workouts get completed/skipped
  useEffect(() => {
    if (eveningWorkouts.length === 0) return;
    const updated = eveningWorkouts
      .map((e) => workouts.find((w) => w.id === e.id))
      .filter((w): w is Workout => !!w && !w.completed && !w.skipped && !w.missed);
    if (updated.length !== eveningWorkouts.length) {
      setEveningWorkouts(updated);
    }
  }, [workouts]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissEvening = useCallback(() => {
    const key = `evening:${getToday()}`;
    shownRef.current.add(key);
    saveShown(shownRef.current);
    setEveningWorkouts([]);
  }, []);

  const snoozeEvening = useCallback(() => {
    setEveningSnoozedUntil(Date.now() + 60 * 60 * 1000);
    setEveningWorkouts([]);
  }, []);

  return {
    permission,
    requestPermission,
    eveningWorkouts,
    dismissEvening,
    snoozeEvening,
  };
}
