import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Workout, DayOfWeek, DAYS_OF_WEEK, WeekReflection, WeekRecord,
  KeyDate, TrainingDataItem, NoteItem, BodyMeasurement, ReminderSettings,
} from "../types/workout";
import {
  TrainingProgram, CYCLE_COLORS,
  getCurrentGlobalWeekIndex, getWeekByGlobalIndex, getAllWeeksFlat,
  formatWeekDateRange, getProgramTotalWeeks,
} from "../types/program";
import { DaySection } from "../components/DaySection";
import { AddWorkoutModal } from "../components/AddWorkoutModal";
import { ImportModal } from "../components/ImportModal";
import { WeeklyReflectionModal } from "../components/WeeklyReflectionModal";
import { EndOfWeekModal } from "../components/EndOfWeekModal";
import { KeyDatesSection } from "../components/KeyDatesSection";
import { EveningReminderBanner } from "../components/EveningReminderBanner";
import { SyncStatus } from "../components/SyncStatus";
import { DataTab } from "./DataTab";
import { NotesTab } from "./NotesTab";
import { TimerTab } from "./TimerTab";
import { SettingsTab, BackupSection } from "./SettingsTab";
import { ProgramTab } from "./ProgramTab";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ClipboardPaste, Trash2, Activity, Zap, History, Calendar, Dumbbell, Menu, ChevronRight, Archive, Layers,
  ChevronDown, ChevronUp, LogIn, LogOut, Timer, Database, FileText, Star, Settings, Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/replit-auth-web";
import { TYPE_CONFIG, WorkoutCard } from "../components/WorkoutCard";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useReminders, getTomorrowDayName } from "../hooks/useReminders";
import { useAppData } from "../hooks/useAppData";

const EOW_DISMISS_KEY = "planer-eow-dismissed";

type TabKey = "week" | "plan" | "timer" | "history" | "data" | "notes" | "settings" | "backup" | "exercise_db" | "sets";

// ─── Motivational messages ────────────────────────────────────────────────────

const MOTIVATIONAL = [
  "Dobra robota! 💪",
  "Tak trzymaj! 🔥",
  "Brawo! 🎉",
  "Kolejny krok zrobiony! 👏",
  "Świetnie Ci idzie! 🌟",
  "Trening zaliczony! ✔️",
  "Jesteś coraz bliżej swojego celu! 🚀",
  "Małe kroki tworzą wielkie efekty. 😊",
  "Twój przyszły ja będzie Ci za to wdzięczny. 🙏",
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekDates(): Record<DayOfWeek, string> {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const fmt = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return {
    Poniedziałek: fmt(new Date(monday.getTime())),
    Wtorek:       fmt(new Date(monday.getTime() + 86400000)),
    Środa:        fmt(new Date(monday.getTime() + 2 * 86400000)),
    Czwartek:     fmt(new Date(monday.getTime() + 3 * 86400000)),
    Piątek:       fmt(new Date(monday.getTime() + 4 * 86400000)),
    Sobota:       fmt(new Date(monday.getTime() + 5 * 86400000)),
    Niedziela:    fmt(new Date(monday.getTime() + 6 * 86400000)),
  };
}

function getWeekLabel(dates: Record<DayOfWeek, string>): string {
  return `${dates["Poniedziałek"]} – ${dates["Niedziela"]}`;
}

function getTodayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function getOrderedDays(todayIndex: number) {
  const result: { day: DayOfWeek; isPast: boolean; isToday: boolean }[] = [];
  result.push({ day: DAYS_OF_WEEK[todayIndex], isPast: false, isToday: true });
  for (let i = todayIndex + 1; i < 7; i++) result.push({ day: DAYS_OF_WEEK[i], isPast: false, isToday: false });
  for (let i = 0; i < todayIndex; i++) result.push({ day: DAYS_OF_WEEK[i], isPast: true, isToday: false });
  return result;
}

// ─── Weekly summary sub-components ───────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  siła: "Siła",
  bieg: "Bieg", bieg_latwy: "B. łatwy", bieg_dlugi: "B. długi", bieg_jakosciowy: "B. jakościowy",
  joga: "Joga", rozciaganie: "Rozciąg.", mobility: "Mobility", joga_rozciaganie: "Joga",
  spacer: "Spacer", rower: "Rower", relaksacja: "Relaks", zabawa_biegowa: "Zabawa", inne: "Inne",
};

function WeeklySummaryStats({ record }: { record: WeekRecord }) {
  const total = record.workouts.length;
  const done = record.workouts.filter((w) => w.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const missed = total - done;

  const byType = record.workouts.reduce<Record<string, { done: number; total: number }>>((acc, w) => {
    const key = w.type ?? "inne";
    if (!acc[key]) acc[key] = { done: 0, total: 0 };
    acc[key].total++;
    if (w.completed) acc[key].done++;
    return acc;
  }, {});

  if (total === 0) return <p className="text-sm text-gray-400 py-2">Brak aktywności w tym tygodniu.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-black text-primary">{done}<span className="text-lg text-gray-400 font-semibold">/{total}</span></p>
          <p className="text-xs text-gray-500 mt-0.5">treningów</p>
        </div>
        <div className="flex-1">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} className={`flex-1 h-2.5 rounded-full ${i < done ? "bg-primary" : "bg-gray-100"}`} />
            ))}
          </div>
          <p className={`text-xs font-bold mt-1.5 ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500"}`}>
            {pct}% realizacji
          </p>
          {missed > 0 && <p className="text-xs text-gray-400">{missed} pominięt{missed === 1 ? "y" : "ych"}</p>}
        </div>
      </div>
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(byType).map(([type, counts]) => {
            const cfg = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG["inne"];
            return (
              <span key={type} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badgeCls}`}>
                {TYPE_LABELS[type] ?? type} {counts.done}/{counts.total}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <Star size={22} className={`transition-colors ${star <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

function HistoryEntry({
  record,
  onUpdate,
}: {
  record: WeekRecord;
  onUpdate: (id: string, updates: Partial<Pick<WeekRecord, "rating" | "weekNote">>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState(record.weekNote ?? "");
  const [noteSaved, setNoteSaved] = useState(!!record.weekNote);
  const completed = record.workouts.filter((w) => w.completed).length;

  const handleRating = (v: number) => onUpdate(record.id, { rating: v });
  const handleNoteSave = () => { onUpdate(record.id, { weekNote: noteText.trim() }); setNoteSaved(true); };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors" onClick={() => setOpen((o) => !o)}>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{record.weekLabel}</p>
            {record.rating && (
              <div className="flex gap-0.5">
                {Array.from({ length: record.rating }).map((_, i) => (
                  <Star key={i} size={11} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {completed}/{record.workouts.length} treningów
            {record.workouts.length > 0 ? ` · ${Math.round((completed / record.workouts.length) * 100)}%` : ""}
            {record.reflection ? " · z refleksją" : ""}
          </p>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-5">
          <WeeklySummaryStats record={record} />
          {record.workouts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Treningi</p>
              {DAYS_OF_WEEK.map((day) => {
                const dw = record.workouts.filter((w) => w.day === day);
                if (!dw.length) return null;
                return (
                  <div key={day}>
                    <p className="text-xs text-gray-400 mb-0.5">{day}</p>
                    {dw.map((w) => {
                      const cfg = TYPE_CONFIG[w.type] ?? TYPE_CONFIG["inne"];
                      return (
                        <div key={w.id} className={`flex items-center gap-2 text-sm py-0.5 ${w.completed ? "text-gray-400" : "text-gray-700"}`}>
                          <span className={w.completed ? "text-primary" : "text-gray-300"}>{w.completed ? "✓" : "○"}</span>
                          <span className={w.completed ? "" : "font-medium"}>{w.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.badgeCls}`}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          {record.reflection && (
            <div className="bg-amber-50 rounded-xl p-4 space-y-2.5 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Refleksja tygodnia</p>
              {record.reflection.q1 && <div><p className="text-xs text-amber-600 font-semibold">Z czego byłam zadowolona</p><p className="text-sm text-gray-700 mt-0.5">{record.reflection.q1}</p></div>}
              {record.reflection.q2 && <div><p className="text-xs text-amber-600 font-semibold">Co było trudne</p><p className="text-sm text-gray-700 mt-0.5">{record.reflection.q2}</p></div>}
              {record.reflection.q3 && <div><p className="text-xs text-amber-600 font-semibold">Plan na kolejny tydzień</p><p className="text-sm text-gray-700 mt-0.5">{record.reflection.q3}</p></div>}
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Jak oceniasz ten tydzień?</p>
            <StarRating value={record.rating ?? 0} onChange={handleRating} />
            <div className="space-y-2">
              <Textarea placeholder="Krótka notatka o tym tygodniu..." value={noteText} onChange={(e) => { setNoteText(e.target.value); setNoteSaved(false); }} className="resize-none h-20 text-sm bg-white" />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleNoteSave} className="text-xs">{noteSaved ? "✓ Zapisano" : "Zapisz notatkę"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  const { user, isLoading: authLoading, isAuthenticated, login, logout } = useAuth();
  const { data, sync, isLoading: dataLoading, updateData, updateSection, syncNow } = useAppData(isAuthenticated);

  // ── Derived data accessors ────────────────────────────────────────────────
  const workouts        = data.currentWeek.workouts;
  const history         = data.history;
  const currentReflection     = data.currentWeek.reflection;
  const reflectionShownCount  = data.currentWeek.reflectionShownCount;
  const keyDates        = data.keyDates;
  const trainingData    = data.trainingData;
  const bodyMeasurements = data.bodyMeasurements;
  const notes           = data.notes;
  const reminderSettings = data.reminderSettings;
  const program         = data.trainingProgram;

  // ── Typed setters (thin wrappers around updateData) ───────────────────────
  const setWorkouts = useCallback((updater: Workout[] | ((prev: Workout[]) => Workout[])) => {
    updateData((prev) => ({
      ...prev,
      currentWeek: {
        ...prev.currentWeek,
        workouts: typeof updater === "function" ? updater(prev.currentWeek.workouts) : updater,
      },
    }));
  }, [updateData]);

  const setHistory = useCallback((updater: WeekRecord[] | ((prev: WeekRecord[]) => WeekRecord[])) => {
    updateData((prev) => ({
      ...prev,
      history: typeof updater === "function" ? updater(prev.history) : updater,
    }));
  }, [updateData]);

  const setCurrentReflection = useCallback((val: WeekReflection | null) => {
    updateData((prev) => ({ ...prev, currentWeek: { ...prev.currentWeek, reflection: val } }));
  }, [updateData]);

  const setReflectionShownCount = useCallback((val: number) => {
    updateData((prev) => ({ ...prev, currentWeek: { ...prev.currentWeek, reflectionShownCount: val } }));
  }, [updateData]);

  const setKeyDates = useCallback((updater: KeyDate[] | ((prev: KeyDate[]) => KeyDate[])) => {
    updateData((prev) => ({
      ...prev,
      keyDates: typeof updater === "function" ? updater(prev.keyDates) : updater,
    }));
  }, [updateData]);

  const setTrainingData    = useCallback((items: TrainingDataItem[])   => updateSection("trainingData", items),    [updateSection]);
  const setBodyMeasurements = useCallback((m: BodyMeasurement[])       => updateSection("bodyMeasurements", m),    [updateSection]);
  const setNotes           = useCallback((n: NoteItem[])               => updateSection("notes", n),               [updateSection]);
  const setReminderSettings = useCallback((s: ReminderSettings)        => updateSection("reminderSettings", s),    [updateSection]);
  const setProgram         = useCallback((p: TrainingProgram | null)   => updateSection("trainingProgram", p),     [updateSection]);

  const handleUpdateWeekRecord = useCallback((id: string, updates: Partial<Pick<WeekRecord, "rating" | "weekNote">>) => {
    setHistory((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }, [setHistory]);

  // ── Navigation ───────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("week");
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isMoreActive = !["week", "plan", "timer"].includes(activeTab);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen]         = useState(false);
  const [isUnplannedModalOpen, setIsUnplannedModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen]   = useState(false);
  const [isReflectionOpen, setIsReflectionOpen]     = useState(false);
  const [isEndOfWeekOpen, setIsEndOfWeekOpen]       = useState(false);
  const [selectedDay, setSelectedDay]               = useState<DayOfWeek | null>(null);
  const [editingWorkout, setEditingWorkout]         = useState<Workout | null>(null);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const lastMotivIdx = useRef(-1);
  const { toast } = useToast();

  const weekDates    = useMemo(() => getWeekDates(), []);
  const todayIndex   = useMemo(() => getTodayIndex(), []);
  const orderedDays  = useMemo(() => getOrderedDays(todayIndex), [todayIndex]);

  const totalPlanned   = useMemo(() => workouts.filter((w) => !w.skipped).length, [workouts]);
  const completedCount = useMemo(() => workouts.filter((w) => w.completed && !w.skipped).length, [workouts]);
  const missedCount    = useMemo(() => workouts.filter((w) => w.missed && !w.skipped && !w.completed).length, [workouts]);

  const allDone = totalPlanned > 0 && (completedCount + missedCount) >= totalPlanned;

  const unloadedPlanCount = useMemo(() => {
    if (!program) return 0;
    const gi = getCurrentGlobalWeekIndex(program);
    if (gi === null) return 0;
    const loc = getWeekByGlobalIndex(program, gi);
    if (!loc) return 0;
    let count = 0;
    for (const pw of loc.week.workouts) {
      if (DAYS_OF_WEEK.indexOf(pw.day) < todayIndex) continue;
      if (!workouts.some((w) => w.day === pw.day && w.type === pw.type && w.name === pw.name)) count++;
    }
    return count;
  }, [program, workouts, todayIndex]);

  const currentProgramInfo = useMemo(() => {
    if (!program) return null;
    const gi = getCurrentGlobalWeekIndex(program);
    if (gi === null) return null;
    const loc = getWeekByGlobalIndex(program, gi);
    if (!loc) return null;
    return {
      cycleName: loc.cycle.name,
      cycleColor: loc.cycle.color,
      weekGlobal: gi + 1,
      totalWeeks: getProgramTotalWeeks(program),
      weekGoal: loc.week.goal,
      dateRange: formatWeekDateRange(program, gi),
      allWeekLocations: getAllWeeksFlat(program),
    };
  }, [program]);

  const { permission: notifPermission, requestPermission, eveningWorkouts, dismissEvening, snoozeEvening } = useReminders({
    workouts,
    settings: reminderSettings,
  });

  useEffect(() => {
    const check = () => {
      if (workouts.length === 0) return;
      const now = new Date();
      const dayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0…Sun=6
      const hour = now.getHours();
      const isEOWTime = (dayIdx === 6 && hour >= 18) || (dayIdx === 0 && hour < 14);
      if (!isEOWTime) return;
      const todayStr = now.toLocaleDateString("sv"); // YYYY-MM-DD local timezone
      if (localStorage.getItem(EOW_DISMISS_KEY) === todayStr) return;
      // Mark as shown today before opening to prevent same-day re-trigger
      localStorage.setItem(EOW_DISMISS_KEY, todayStr);
      setIsEndOfWeekOpen(true);
    };
    check();
    // Re-check every minute so the modal appears when the time boundary is crossed
    // even if the user keeps the app open without changing workouts
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [workouts.length]);

  // ── Workout handlers ──────────────────────────────────────────────────────
  const handleAddWorkout = (workoutData: Omit<Workout, "id" | "completed">) => {
    const newWorkout: Workout = { ...workoutData, id: Date.now().toString() + Math.random().toString(36).substr(2, 5), completed: false };
    setWorkouts((prev) => [...prev, newWorkout]);
    toast({ title: "Trening dodany!", description: `${newWorkout.name} → ${newWorkout.day}` });
  };

  const handleImportWorkouts = (imported: Omit<Workout, "id" | "completed">[]) => {
    const newWorkouts = imported.map((w) => ({ ...w, id: Date.now().toString() + Math.random().toString(36).substr(2, 5), completed: false }));
    setWorkouts((prev) => [...prev, ...newWorkouts]);
    toast({ title: "Import zakończony!", description: `Dodano ${newWorkouts.length} treningów.` });
  };

  const handleToggleComplete = (id: string, completed: boolean) => {
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, completed } : w));
    if (completed) {
      let idx: number;
      do { idx = Math.floor(Math.random() * MOTIVATIONAL.length); } while (idx === lastMotivIdx.current && MOTIVATIONAL.length > 1);
      lastMotivIdx.current = idx;
      toast({ description: MOTIVATIONAL[idx], duration: 2000 });
    }
  };

  const handleDeleteWorkout     = (id: string) => setWorkouts((prev) => prev.filter((w) => w.id !== id));
  const handleUpdateNotes       = (id: string, notes: string) => setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, notes } : w));
  const handleMissedWorkout     = (id: string, reason: string | null) => {
    setWorkouts((prev) => prev.map((w) => w.id === id
      ? { ...w, missed: reason !== null, missedReason: reason ?? undefined, completed: false }
      : w
    ));
  };

  const handleLoadWeekFromPlan = () => {
    if (!program) return;
    const gi = getCurrentGlobalWeekIndex(program);
    if (gi === null) { toast({ description: "Program nie jest aktywny w tym tygodniu." }); return; }
    const loc = getWeekByGlobalIndex(program, gi);
    if (!loc) return;
    const newWorkouts: Workout[] = [];
    for (const pw of loc.week.workouts) {
      if (DAYS_OF_WEEK.indexOf(pw.day) < todayIndex) continue;
      if (!workouts.some((w) => w.day === pw.day && w.type === pw.type && w.name === pw.name)) {
        newWorkouts.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          day: pw.day, type: pw.type, name: pw.name, description: pw.description, completed: false,
          intensity: pw.intensity, distance: pw.distance, duration: pw.duration,
          reps: pw.reps, pace: pw.pace, heartRate: pw.heartRate, weight: pw.weight, customNotes: pw.customNotes,
        });
      }
    }
    if (newWorkouts.length === 0) { toast({ description: "Wszystkie treningi z programu (od dziś) są już w tym tygodniu." }); return; }
    setWorkouts((prev) => [...prev, ...newWorkouts]);
    toast({ title: "Plan załadowany!", description: `Dodano ${newWorkouts.length} treningów od dziś.` });
  };

  const handleSaveEditedWorkout = (id: string, workoutData: Omit<Workout, "id" | "completed">) => {
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, ...workoutData } : w));
    setEditingWorkout(null);
    toast({ description: "Trening zaktualizowany.", duration: 1500 });
  };

  const handleSkipWorkout  = (id: string) => setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, skipped: !w.skipped } : w));
  const handleMoveTomorrow = (id: string) => {
    const tomorrow = getTomorrowDayName();
    setWorkouts((prev) => prev.map((w) => w.id === id ? { ...w, day: tomorrow, movedFrom: w.day } : w));
    toast({ description: `Trening przeniesiony na ${tomorrow}`, duration: 1500 });
  };

  const handleDragStart  = (event: DragStartEvent) => setActiveDragId(event.active.id as string);
  const handleDragCancel = () => setActiveDragId(null);
  const handleDragEnd    = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;
    const newDay = over.id as DayOfWeek;
    const fromDay = (active.data.current as { day?: DayOfWeek })?.day;
    if (!fromDay || fromDay === newDay) return;
    setWorkouts((prev) => prev.map((w) => w.id === active.id ? { ...w, day: newDay, movedFrom: fromDay } : w));
    toast({ description: `Trening przeniesiony na ${newDay}`, duration: 1500 });
  };

  const handleSaveReflection = (reflection: WeekReflection) => {
    setCurrentReflection(reflection);
    toast({ title: "Refleksja zapisana!", description: "Powodzenia w następnym tygodniu!" });
  };

  const handleClearWeek = () => setIsEndOfWeekOpen(true);

  const handleEndOfWeekDismiss = () => {
    const todayStr = new Date().toLocaleDateString("sv"); // YYYY-MM-DD local timezone
    localStorage.setItem(EOW_DISMISS_KEY, todayStr);
    setIsEndOfWeekOpen(false);
  };

  /**
   * Called immediately when user confirms "Zapisz i zacznij nowy tydzień".
   * Archives the week right away — before the plan-load decision in step 2.
   */
  const handleEndOfWeekArchive = (reflection: WeekReflection) => {
    if (workouts.length > 0) {
      const record: WeekRecord = {
        id: Date.now().toString(),
        weekLabel: getWeekLabel(weekDates),
        savedAt: new Date().toISOString(),
        workouts,
        reflection,
      };
      setHistory((prev) => [record, ...prev]);
    }
    setCurrentReflection(null);
    setReflectionShownCount(0);
    setWorkouts([]);
    toast({ title: "Nowy tydzień! 🎉", description: "Poprzedni tydzień zapisany w historii." });
  };

  /**
   * Called after archive when user decides whether to load workouts from the program.
   * load=true → load next program week; load=false → do nothing (already cleared).
   * Also called with false when user closes dialog at step 2 via X/ESC.
   */
  const handleEndOfWeekLoadPlan = (load: boolean) => {
    setIsEndOfWeekOpen(false);
    if (!load || !program) return;
    // Determine which program week to load:
    //   Sunday (todayIndex=6): user is closing this week → load gi+1 (next week)
    //   Monday (todayIndex=0): new week already started → load gi (current week)
    const gi = getCurrentGlobalWeekIndex(program);
    const loadGi = gi !== null ? (todayIndex === 6 ? gi + 1 : gi) : null;
    const loc = loadGi !== null ? getWeekByGlobalIndex(program, loadGi) : null;
    if (!loc) {
      if (gi === null) {
        toast({
          title: "Program nieaktywny",
          description: "Ten tydzień nie należy do żadnego tygodnia programu — sprawdź daty programu w zakładce Plan.",
        });
      } else {
        toast({
          title: "Koniec programu",
          description: "Jesteś na ostatnim tygodniu programu — brak następnego tygodnia do załadowania.",
        });
      }
      return;
    }
    const planWorkouts: Workout[] = loc.week.workouts.map((pw) => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      day: pw.day, type: pw.type, name: pw.name, description: pw.description,
      completed: false, intensity: pw.intensity, distance: pw.distance,
      duration: pw.duration, reps: pw.reps, pace: pw.pace,
      heartRate: pw.heartRate, weight: pw.weight, customNotes: pw.customNotes,
    }));
    setWorkouts(planWorkouts);
    toast({
      title: "Plan załadowany!",
      description: `Dodano ${planWorkouts.length} treningów z programu.`,
    });
  };

  const openAddModalForDay = (day: DayOfWeek) => { setSelectedDay(day); setIsAddModalOpen(true); };
  const displayName = user?.firstName ?? user?.email?.split("@")[0] ?? "Użytkownik";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shrink-0">
                <Activity size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-tight">Mój planer treningów</h1>
                {isAuthenticated && !authLoading && (
                  <p className="text-xs text-gray-400">Witaj, {displayName}</p>
                )}
              </div>
            </div>
            {!authLoading && (
              isAuthenticated ? (
                <Button size="sm" variant="ghost" onClick={logout} className="text-gray-500 hover:text-gray-800 text-xs gap-1">
                  <LogOut size={14} /> Wyloguj
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={login} className="text-xs gap-1 border-primary text-primary hover:bg-primary hover:text-white">
                  <LogIn size={14} /> Zaloguj się
                </Button>
              )
            )}
          </div>

          <KeyDatesSection dates={keyDates} onChange={setKeyDates} />

          {activeTab === "week" && (
            <div className="flex items-center gap-2 pt-0.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-0.5">
              <Button size="sm" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 shadow-none font-semibold text-xs" onClick={() => setIsUnplannedModalOpen(true)}>
                <Zap className="mr-1.5 h-3 w-3" /> Niezaplanowany
              </Button>
              <Button size="sm" variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 text-xs" onClick={() => setIsImportModalOpen(true)}>
                <ClipboardPaste className="mr-1.5 h-3 w-3" /> Wklej plan
              </Button>
              {unloadedPlanCount > 0 && (
                <Button size="sm" variant="outline" onClick={handleLoadWeekFromPlan} className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary text-xs gap-1.5">
                  <Download className="h-3 w-3" /> Z planu ({unloadedPlanCount})
                </Button>
              )}
              {workouts.length > 0 && (
                <Button size="sm" variant="ghost" className="text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs gap-1.5" onClick={handleClearWeek}>
                  <Trash2 className="h-3 w-3" />Nowy tydzień
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-28">
        {!authLoading && !isAuthenticated && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-blue-700">
              <strong>Tryb offline</strong> — dane lokalne. Zaloguj się, aby synchronizować między urządzeniami.
            </p>
            <Button size="sm" onClick={login} variant="outline" className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs">
              Zaloguj się
            </Button>
          </div>
        )}

        {/* Sync loading overlay — only on initial login load */}
        {dataLoading && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-600 text-center">
            Synchronizowanie danych…
          </div>
        )}

        {/* ─── Tydzień ──────────────────────────────────────────────────────── */}
        {activeTab === "week" && (
          <div className="space-y-5">
            {eveningWorkouts.length > 0 && (
              <EveningReminderBanner
                workouts={eveningWorkouts}
                onMarkDone={(id) => handleToggleComplete(id, true)}
                onMoveTomorrow={handleMoveTomorrow}
                onSkip={handleSkipWorkout}
                onSnooze={snoozeEvening}
                onDismiss={dismissEvening}
              />
            )}

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Postęp tygodnia</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {totalPlanned === 0 ? "Zaplanuj treningi poniżej" : `${totalPlanned} zaplanowanych treningów`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {totalPlanned > 0 && (
                    <span className="font-bold text-primary bg-primary/10 px-3 py-1 rounded-full text-sm">
                      {completedCount} / {totalPlanned}
                    </span>
                  )}
                </div>
              </div>

              {totalPlanned === 0 ? (
                <p className="text-sm text-gray-400 py-1">Brak zaplanowanych treningów w tym tygodniu.</p>
              ) : (
                <>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPlanned }).map((_, i) => (
                      <div key={i} className={`flex-1 h-3 rounded-full transition-all duration-500 ${
                        i < completedCount ? "bg-primary" :
                        i < completedCount + missedCount ? "bg-red-300" : "bg-gray-100"
                      }`} />
                    ))}
                  </div>
                  {missedCount > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      {missedCount} {missedCount === 1 ? "trening nie odbył się" : "treningi nie odbyły się"}
                    </p>
                  )}
                </>
              )}

              {currentProgramInfo && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CYCLE_COLORS[currentProgramInfo.cycleColor].badge}`}>
                      {currentProgramInfo.cycleName}
                    </span>
                    <span className="text-xs text-gray-400">
                      T{currentProgramInfo.weekGlobal}/{currentProgramInfo.totalWeeks} · {currentProgramInfo.dateRange}
                    </span>
                  </div>
                  {currentProgramInfo.weekGoal && (
                    <p className="text-xs text-gray-500 italic">🎯 {currentProgramInfo.weekGoal}</p>
                  )}
                  <div className="flex gap-0.5 overflow-hidden rounded">
                    {currentProgramInfo.allWeekLocations.map((loc) => (
                      <div
                        key={loc.globalIndex}
                        className={`flex-1 h-2 ${CYCLE_COLORS[loc.cycle.color].bar} ${
                          loc.globalIndex === currentProgramInfo.weekGlobal - 1 ? "ring-1 ring-gray-500 ring-offset-1 opacity-100" : "opacity-30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {allDone && !currentReflection && (
                <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between gap-3">
                  <p className="text-sm text-green-700 font-semibold">Świetna robota! 🎉</p>
                  <button onClick={() => setIsReflectionOpen(true)} className="text-xs text-primary font-semibold hover:underline shrink-0">Dodaj refleksję →</button>
                </div>
              )}
              {allDone && currentReflection && (
                <div className="mt-3 p-4 bg-green-50 rounded-xl border border-green-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold text-sm">✓ Tydzień ukończony!</span>
                    <span className="text-xs text-green-500">Refleksja zapisana</span>
                  </div>
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold" onClick={handleClearWeek}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Zapisz tydzień w historii i zacznij nowy
                  </Button>
                </div>
              )}
              {!allDone && currentReflection && (
                <p className="text-xs text-green-600 font-medium mt-2">✓ Refleksja tygodnia zapisana</p>
              )}
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
              <div className="flex flex-col gap-4">
                {orderedDays.map(({ day, isPast, isToday }) => (
                  <DaySection
                    key={day}
                    day={day}
                    date={weekDates[day]}
                    workouts={workouts.filter((w) => w.day === day)}
                    onAddWorkout={openAddModalForDay}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteWorkout}
                    onUpdateNotes={handleUpdateNotes}
                    onSkip={handleSkipWorkout}
                    onMissed={handleMissedWorkout}
                    onEdit={setEditingWorkout}
                    isToday={isToday}
                    isPast={isPast}
                    activeDragId={activeDragId}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
                {activeDragId ? (() => {
                  const w = workouts.find((x) => x.id === activeDragId);
                  return w ? (
                    <WorkoutCard workout={w} isDragOverlay onToggleComplete={() => {}} onDelete={() => {}} onUpdateNotes={() => {}} onSkip={() => {}} onMissed={() => {}} />
                  ) : null;
                })() : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* ─── Plan treningowy ──────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <ProgramTab program={program} onChange={setProgram} />
        )}

        {/* ─── Historia ─────────────────────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <History size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Brak historii</p>
                <p className="text-sm mt-1">Ukończony tydzień pojawi się tutaj po kliknięciu „Nowy tydzień".</p>
              </div>
            ) : (
              history.map((record) => <HistoryEntry key={record.id} record={record} onUpdate={handleUpdateWeekRecord} />)
            )}
          </div>
        )}

        {/* ─── Dane ─────────────────────────────────────────────────────────────── */}
        {activeTab === "data" && (
          <DataTab items={trainingData} onChange={setTrainingData} measurements={bodyMeasurements} onMeasurementsChange={setBodyMeasurements} />
        )}

        {/* ─── Notatki ─────────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <NotesTab notes={notes} onChange={setNotes} />
        )}

        {/* ─── Timer ───────────────────────────────────────────────────────────── */}
        {activeTab === "timer" && <TimerTab />}

        {/* ─── Ustawienia ──────────────────────────────────────────────────────── */}
        {activeTab === "settings" && (
          <SettingsTab
            settings={reminderSettings}
            onChange={setReminderSettings}
            permission={notifPermission}
            onRequestPermission={requestPermission}
            sync={sync}
            isAuthenticated={isAuthenticated}
            onSyncNow={syncNow}
            appData={data}
            onRestoreData={(restored) => updateData(() => restored)}
          />
        )}

        {/* ─── Kopia zapasowa ──────────────────────────────────────────────────── */}
        {activeTab === "backup" && (
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-gray-900">Kopia zapasowa</h3>
              <p className="text-xs text-gray-400 mt-0.5">Eksport i import danych aplikacji</p>
            </div>
            <BackupSection appData={data} onRestoreData={(restored) => updateData(() => restored)} />
          </div>
        )}

        {/* ─── Baza ćwiczeń ────────────────────────────────────────────────────── */}
        {activeTab === "exercise_db" && (
          <div className="text-center py-16 text-gray-400">
            <Dumbbell size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-500 text-base">Baza ćwiczeń</p>
            <p className="text-sm mt-1">Biblioteka ćwiczeń z opisami i filmami instruktażowymi.</p>
            <span className="mt-4 inline-block text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">Wkrótce</span>
          </div>
        )}

        {/* ─── Zestawy ─────────────────────────────────────────────────────────── */}
        {activeTab === "sets" && (
          <div className="text-center py-16 text-gray-400">
            <Layers size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-gray-500 text-base">Zestawy ćwiczeń</p>
            <p className="text-sm mt-1">Gotowe zestawy ćwiczeń do użycia w planie treningowym.</p>
            <span className="mt-4 inline-block text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">Wkrótce</span>
          </div>
        )}
      </main>

      {/* ─── Fixed bottom navigation ─────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-100 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-3xl mx-auto flex h-[60px]">
          {([
            { tab: "week",  Icon: Calendar, label: "Tydzień" },
            { tab: "plan",  Icon: Dumbbell, label: "Plan" },
            { tab: "timer", Icon: Timer,    label: "Timer" },
          ] as const).map(({ tab, Icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-xs font-medium transition-colors ${
                activeTab === tab ? "text-primary" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-xs font-medium transition-colors relative ${
              isMoreActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {isMoreActive && (
              <span className="absolute top-2 right-[calc(25%-12px)] w-2 h-2 rounded-full bg-primary" />
            )}
            <Menu size={22} />
            <span>Więcej</span>
          </button>
        </div>
      </nav>

      {/* ─── Więcej sheet ────────────────────────────────────────────────────── */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-2xl px-0 pt-0" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <SheetHeader className="px-5 py-3 border-b border-gray-100">
            <SheetTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Więcej</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto py-2">
            {([
              { tab: "history",     Icon: History,  label: "Historia",        soon: false },
              { tab: "exercise_db", Icon: Dumbbell, label: "Baza ćwiczeń",   soon: true  },
              { tab: "sets",        Icon: Layers,   label: "Zestawy",         soon: true  },
              { tab: "data",        Icon: Database, label: "Dane i pomiary",  soon: false },
              { tab: "notes",       Icon: FileText, label: "Notatki",         soon: false },
              { tab: "settings",    Icon: Settings, label: "Ustawienia",      soon: false },
              { tab: "backup",      Icon: Archive,  label: "Kopia zapasowa",  soon: false },
            ] as const).map(({ tab, Icon, label, soon }) => (
              <button
                key={tab}
                onClick={() => { if (!soon) { setActiveTab(tab); setIsMoreOpen(false); } }}
                className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                  !soon ? "hover:bg-gray-50 active:bg-gray-100" : "cursor-default"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === tab ? "bg-primary/10" : "bg-gray-100"
                }`}>
                  <Icon size={18} className={activeTab === tab ? "text-primary" : "text-gray-400"} />
                </div>
                <span className={`flex-1 text-sm font-medium ${activeTab === tab ? "text-primary" : soon ? "text-gray-400" : "text-gray-700"}`}>
                  {label}
                </span>
                {soon ? (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">wkrótce</span>
                ) : (
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AddWorkoutModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} selectedDay={selectedDay} onAdd={handleAddWorkout} remindersEnabled={reminderSettings.remindersEnabled} />
      <AddWorkoutModal isOpen={isUnplannedModalOpen} onClose={() => setIsUnplannedModalOpen(false)} selectedDay={null} onAdd={handleAddWorkout} unplanned />
      <AddWorkoutModal
        isOpen={!!editingWorkout}
        onClose={() => setEditingWorkout(null)}
        selectedDay={editingWorkout?.day ?? null}
        onAdd={() => {}}
        editWorkout={editingWorkout}
        onSave={handleSaveEditedWorkout}
        remindersEnabled={reminderSettings.remindersEnabled}
      />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportWorkouts} />
      <WeeklyReflectionModal isOpen={isReflectionOpen} onClose={() => setIsReflectionOpen(false)} onSave={handleSaveReflection} />

      <EndOfWeekModal
        isOpen={isEndOfWeekOpen}
        onClose={() => setIsEndOfWeekOpen(false)}
        onDismiss={handleEndOfWeekDismiss}
        onArchive={handleEndOfWeekArchive}
        onLoadFromPlan={handleEndOfWeekLoadPlan}
        workouts={workouts}
        hasProgram={!!program}
        existingReflection={currentReflection}
      />
    </div>
  );
}
